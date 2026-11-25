const { AppError } = require('../errors');
const { verifyAccessToken } = require('../utils/tokens');
const { query } = require('../db');

// Exige um access token válido e confirma no banco que a conta ainda está ativa.
async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Autenticação necessária.');
  }
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Token inválido ou expirado.');
  }
  const { rows } = await query('SELECT id, role, is_active FROM users WHERE id = $1', [payload.sub]);
  if (!rows[0] || !rows[0].is_active) {
    throw new AppError(401, 'INVALID_TOKEN', 'Token inválido ou expirado.');
  }
  req.user = { id: rows[0].id, role: rows[0].role };
  next();
}

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'Você não tem permissão para esta ação.');
  }
  next();
};

module.exports = { authenticate, requireRole };
