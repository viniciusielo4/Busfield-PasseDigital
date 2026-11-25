const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const config = require('../config');
const { query, withTransaction } = require('../db');
const { AppError } = require('../errors');
const { sha256, signAccessToken, generateOpaqueToken } = require('../utils/tokens');
const { toUser, toCard } = require('../utils/serializers');

// Hash fictício para gastar o mesmo tempo quando o e-mail não existe (evita revelar contas pela latência).
const DUMMY_HASH = bcrypt.hashSync('senha-fictícia', config.bcryptCost);

const daysFromNow = (d) => new Date(Date.now() + d * 24 * 60 * 60 * 1000);

async function issueTokens(client, user) {
  const { token, hash } = generateOpaqueToken();
  await client.query(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [user.id, hash, daysFromNow(config.refreshTokenTtlDays)]
  );
  return {
    accessToken: signAccessToken(user),
    refreshToken: token,
    tokenType: 'Bearer',
    expiresIn: config.accessTokenTtlSeconds,
  };
}

// Gera o identificador do cartão no formato BF-0000-0000
function newCardNumber() {
  const d = () => String(crypto.randomInt(0, 10000)).padStart(4, '0');
  return `BF-${d()}-${d()}`;
}

async function createCardWithWallet(client, userId) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { rows } = await client.query(
        'INSERT INTO cards (user_id, card_number) VALUES ($1, $2) RETURNING *',
        [userId, newCardNumber()]
      );
      await client.query('INSERT INTO wallets (card_id) VALUES ($1)', [rows[0].id]);
      return { ...rows[0], balance_cents: 0 };
    } catch (err) {
      if (err.code === '23505' && err.constraint === 'cards_card_number_key') {
        await client.query('ROLLBACK TO SAVEPOINT card_try').catch(() => {});
        continue;
      }
      throw err;
    }
  }
  throw new AppError(500, 'CARD_NUMBER_GENERATION_FAILED', 'Não foi possível gerar o cartão. Tente novamente.');
}

// Cadastro: cria usuário, cartão digital e carteira na mesma transação.
async function register({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, config.bcryptCost);
  return withTransaction(async (client) => {
    let user;
    try {
      const { rows } = await client.query(
        'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *',
        [name, email, passwordHash]
      );
      user = rows[0];
    } catch (err) {
      if (err.code === '23505') throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.');
      throw err;
    }
    await client.query('SAVEPOINT card_try');
    const card = await createCardWithWallet(client, user.id);
    const tokens = await issueTokens(client, user);
    return { user: toUser(user), card: toCard(card), tokens };
  });
}

async function login({ email, password }) {
  const { rows } = await query('SELECT * FROM users WHERE lower(email) = lower($1)', [email]);
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'E-mail ou senha incorretos.');
  if (!user.is_active) throw new AppError(403, 'ACCOUNT_DISABLED', 'Conta desativada.');
  const tokens = await withTransaction((client) => issueTokens(client, user));
  return { user: toUser(user), tokens };
}

// Renovação com rotação: cada refresh token só vale uma vez. Reuso de um token já usado revoga todas as sessões.
async function refresh(refreshToken) {
  const result = await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = $1 FOR UPDATE', [sha256(refreshToken)]
    );
    const row = rows[0];
    if (!row) return { error: 'invalid' };
    if (row.revoked_at) {
      await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [row.user_id]);
      return { error: 'reuse' };
    }
    if (row.expires_at < new Date()) return { error: 'invalid' };
    const { rows: users } = await client.query('SELECT * FROM users WHERE id = $1', [row.user_id]);
    if (!users[0] || !users[0].is_active) return { error: 'invalid' };
    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE id = $1', [row.id]);
    return { tokens: await issueTokens(client, users[0]) };
  });
  if (result.error) throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Sessão inválida ou expirada. Faça login novamente.');
  return result.tokens;
}

async function logout(refreshToken) {
  await query('UPDATE refresh_tokens SET revoked_at = now() WHERE token_hash = $1 AND revoked_at IS NULL', [sha256(refreshToken)]);
}

// Resposta sempre igual, exista ou não o e-mail (não revela quem tem conta).
async function forgotPassword(email) {
  const { rows } = await query('SELECT id FROM users WHERE lower(email) = lower($1) AND is_active', [email]);
  if (!rows[0]) return null;
  const { token, hash } = generateOpaqueToken();
  await withTransaction(async (client) => {
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL', [rows[0].id]);
    await client.query(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [rows[0].id, hash, new Date(Date.now() + config.passwordResetTtlMinutes * 60 * 1000)]
    );
  });
  // TODO (fase futura): enviar o token por e-mail. No MVP ele só é exposto se EXPOSE_RESET_TOKEN=true.
  return token;
}

async function resetPassword({ token, newPassword }) {
  const passwordHash = await bcrypt.hash(newPassword, config.bcryptCost);
  await withTransaction(async (client) => {
    const { rows } = await client.query(
      'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now() FOR UPDATE',
      [sha256(token)]
    );
    if (!rows[0]) throw new AppError(400, 'INVALID_RESET_TOKEN', 'Código de recuperação inválido ou expirado.');
    await client.query('UPDATE password_reset_tokens SET used_at = now() WHERE id = $1', [rows[0].id]);
    await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, rows[0].user_id]);
    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [rows[0].user_id]);
  });
}

async function changePassword(userId, { currentPassword, newPassword }) {
  const { rows } = await query('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (!rows[0] || !(await bcrypt.compare(currentPassword, rows[0].password_hash))) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Senha atual incorreta.');
  }
  const passwordHash = await bcrypt.hash(newPassword, config.bcryptCost);
  await withTransaction(async (client) => {
    await client.query('UPDATE users SET password_hash = $1, updated_at = now() WHERE id = $2', [passwordHash, userId]);
    await client.query('UPDATE refresh_tokens SET revoked_at = now() WHERE user_id = $1 AND revoked_at IS NULL', [userId]);
  });
}

module.exports = { register, login, refresh, logout, forgotPassword, resetPassword, changePassword };
