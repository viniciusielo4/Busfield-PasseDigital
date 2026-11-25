const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const config = require('../config');

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');

function signAccessToken(user) {
  return jwt.sign({ role: user.role }, config.jwtSecret, {
    algorithm: 'HS256',
    subject: user.id,
    expiresIn: config.accessTokenTtlSeconds,
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
}

// Token opaco aleatório: o valor vai para o cliente e apenas o hash é guardado no banco.
function generateOpaqueToken() {
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, hash: sha256(token) };
}

module.exports = { sha256, signAccessToken, verifyAccessToken, generateOpaqueToken };
