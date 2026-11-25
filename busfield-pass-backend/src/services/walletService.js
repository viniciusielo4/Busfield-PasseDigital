const { query, withTransaction } = require('../db');
const { AppError } = require('../errors');
const { audit } = require('./audit');
const { toCard, toTransaction } = require('../utils/serializers');

async function getSettings(client) {
  const { rows } = await client.query('SELECT key, value FROM settings');
  const s = Object.fromEntries(rows.map((r) => [r.key, Number(r.value)]));
  return { fareCents: s.fare_cents, minRechargeCents: s.min_recharge_cents, maxRechargeCents: s.max_recharge_cents };
}

async function getCardWithWallet(userId) {
  const { rows } = await query(
    `SELECT c.*, w.balance_cents FROM cards c JOIN wallets w ON w.card_id = c.id WHERE c.user_id = $1`, [userId]
  );
  if (!rows[0]) throw new AppError(404, 'CARD_NOT_FOUND', 'Cartão não encontrado.');
  return rows[0];
}

async function getWalletSummary(userId) {
  const card = await getCardWithWallet(userId);
  const settings = await getSettings({ query });
  return { ...toCard(card), ...settings };
}

// Núcleo financeiro: toda recarga/pagamento passa por aqui, dentro de UMA transação,
// com o cartão e a carteira travados (FOR UPDATE) para impedir saldo negativo e duplicidade em operações simultâneas.
async function applyMovement(userId, { type, amountCents, idempotencyKey }) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT c.id, c.card_number, c.status, w.balance_cents
         FROM cards c JOIN wallets w ON w.card_id = c.id
        WHERE c.user_id = $1 FOR UPDATE OF c, w`, [userId]
    );
    const card = rows[0];
    if (!card) throw new AppError(404, 'CARD_NOT_FOUND', 'Cartão não encontrado.');

    const settings = await getSettings(client);
    const amount = type === 'payment' ? settings.fareCents : amountCents;

    // Idempotência: a mesma chave devolve a operação já feita, sem novo débito/crédito.
    const { rows: existing } = await client.query(
      'SELECT * FROM transactions WHERE card_id = $1 AND idempotency_key = $2', [card.id, idempotencyKey]
    );
    if (existing[0]) {
      if (existing[0].type !== type || Number(existing[0].amount_cents) !== Number(amount)) {
        throw new AppError(409, 'IDEMPOTENCY_KEY_REUSED', 'Esta chave de idempotência já foi usada em outra operação.');
      }
      return { transaction: toTransaction({ ...existing[0], card_number: card.card_number }), replayed: true };
    }

    if (card.status !== 'active') {
      throw new AppError(422, 'CARD_BLOCKED', 'Cartão bloqueado. Desbloqueie o cartão para continuar.');
    }

    let newBalance;
    let description;
    if (type === 'recharge') {
      if (amount < settings.minRechargeCents) {
        throw new AppError(422, 'RECHARGE_BELOW_MINIMUM', 'Valor abaixo da recarga mínima.', { minRechargeCents: settings.minRechargeCents });
      }
      if (amount > settings.maxRechargeCents) {
        throw new AppError(422, 'RECHARGE_ABOVE_MAXIMUM', 'Valor acima da recarga máxima.', { maxRechargeCents: settings.maxRechargeCents });
      }
      newBalance = Number(card.balance_cents) + amount;
      description = 'Recarga simulada';
    } else {
      if (Number(card.balance_cents) < amount) {
        throw new AppError(422, 'INSUFFICIENT_BALANCE', 'Saldo insuficiente para a tarifa.', {
          fareCents: amount, balanceCents: Number(card.balance_cents),
        });
      }
      newBalance = Number(card.balance_cents) - amount;
      description = 'Passagem (simulada)';
    }

    await client.query('UPDATE wallets SET balance_cents = $1, updated_at = now() WHERE card_id = $2', [newBalance, card.id]);
    const { rows: created } = await client.query(
      `INSERT INTO transactions (card_id, type, amount_cents, balance_after_cents, description, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [card.id, type, amount, newBalance, description, idempotencyKey]
    );
    return { transaction: toTransaction({ ...created[0], card_number: card.card_number }), replayed: false };
  });
}

const recharge = (userId, amountCents, idempotencyKey) => applyMovement(userId, { type: 'recharge', amountCents, idempotencyKey });
const payFare = (userId, idempotencyKey) => applyMovement(userId, { type: 'payment', idempotencyKey });

async function setCardStatus(actor, cardWhere, status) {
  return withTransaction(async (client) => {
    const { rows } = await client.query(
      `SELECT c.* FROM cards c WHERE ${cardWhere.sql} FOR UPDATE`, cardWhere.params
    );
    if (!rows[0]) throw new AppError(404, 'CARD_NOT_FOUND', 'Cartão não encontrado.');
    if (rows[0].status !== status) {
      await client.query('UPDATE cards SET status = $1, updated_at = now() WHERE id = $2', [status, rows[0].id]);
      await audit(client, {
        actorUserId: actor.id, action: status === 'blocked' ? 'card.block' : 'card.unblock',
        entity: 'card', entityId: rows[0].id, metadata: { by: actor.role },
      });
    }
    const { rows: out } = await client.query(
      'SELECT c.*, w.balance_cents FROM cards c JOIN wallets w ON w.card_id = c.id WHERE c.id = $1', [rows[0].id]
    );
    return toCard(out[0]);
  });
}

const setOwnCardStatus = (user, status) => setCardStatus(user, { sql: 'c.user_id = $1', params: [user.id] }, status);
const setCardStatusById = (admin, cardId, status) => setCardStatus(admin, { sql: 'c.id = $1', params: [cardId] }, status);

module.exports = { getSettings, getCardWithWallet, getWalletSummary, recharge, payFare, setOwnCardStatus, setCardStatusById };
