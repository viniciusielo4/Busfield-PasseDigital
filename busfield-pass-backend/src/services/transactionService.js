const { query } = require('../db');
const { AppError } = require('../errors');
const { toTransaction } = require('../utils/serializers');
const { meta } = require('../utils/pagination');

// Monta filtros comuns. Período: from <= created_at < to.
function buildFilters(base, { type, from, to }) {
  const where = [...base.where]; const params = [...base.params];
  if (type) { params.push(type); where.push(`t.type = $${params.length}`); }
  if (from) { params.push(from); where.push(`t.created_at >= $${params.length}`); }
  if (to) { params.push(to); where.push(`t.created_at < $${params.length}`); }
  return { where, params };
}

async function listForUser(userId, filters) {
  const { page, limit } = filters;
  const { where, params } = buildFilters({ where: ['c.user_id = $1'], params: [userId] }, filters);
  const from = `FROM transactions t JOIN cards c ON c.id = t.card_id WHERE ${where.join(' AND ')}`;
  const { rows: count } = await query(`SELECT count(*)::int AS n ${from}`, params);
  const { rows } = await query(
    `SELECT t.*, c.card_number ${from} ORDER BY t.created_at DESC, t.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );
  return { data: rows.map(toTransaction), pagination: meta(page, limit, count[0].n) };
}

async function summaryForUser(userId, filters) {
  const { where, params } = buildFilters({ where: ['c.user_id = $1'], params: [userId] }, filters);
  const { rows } = await query(
    `SELECT
       COALESCE(sum(t.amount_cents) FILTER (WHERE t.type = 'recharge'), 0)::bigint AS recharged,
       COALESCE(sum(t.amount_cents) FILTER (WHERE t.type = 'payment'), 0)::bigint AS spent,
       count(*) FILTER (WHERE t.type = 'recharge')::int AS recharges,
       count(*) FILTER (WHERE t.type = 'payment')::int AS payments
     FROM transactions t JOIN cards c ON c.id = t.card_id WHERE ${where.join(' AND ')}`, params
  );
  const r = rows[0];
  return {
    period: { from: filters.from ?? null, to: filters.to ?? null },
    totalRechargedCents: Number(r.recharged), totalSpentCents: Number(r.spent),
    rechargesCount: r.recharges, paymentsCount: r.payments,
  };
}

// Comprovante de uma movimentação do próprio usuário
async function getReceipt(userId, transactionId) {
  const { rows } = await query(
    `SELECT t.*, c.card_number FROM transactions t JOIN cards c ON c.id = t.card_id
      WHERE t.id = $1 AND c.user_id = $2`, [transactionId, userId]
  );
  if (!rows[0]) throw new AppError(404, 'TRANSACTION_NOT_FOUND', 'Movimentação não encontrada.');
  return {
    ...toTransaction(rows[0]),
    notice: rows[0].is_simulated ? 'Operação simulada (demonstração): sem movimentação de dinheiro real.' : undefined,
  };
}

async function listAll(filters) {
  const { page, limit, cardNumber } = filters;
  const base = { where: ['true'], params: [] };
  if (cardNumber) { base.params.push(cardNumber); base.where.push(`c.card_number = $${base.params.length}`); }
  const { where, params } = buildFilters(base, filters);
  const from = `FROM transactions t JOIN cards c ON c.id = t.card_id WHERE ${where.join(' AND ')}`;
  const { rows: count } = await query(`SELECT count(*)::int AS n ${from}`, params);
  const { rows } = await query(
    `SELECT t.*, c.card_number ${from} ORDER BY t.created_at DESC, t.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );
  return { data: rows.map(toTransaction), pagination: meta(page, limit, count[0].n) };
}

module.exports = { listForUser, summaryForUser, getReceipt, listAll };
