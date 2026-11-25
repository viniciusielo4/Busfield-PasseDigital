const { AppError } = require('../errors');
const config = require('../config');

function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'Rota não encontrada.'));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, details: err.details } });
  }
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Corpo da requisição não é um JSON válido.' } });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'Requisição grande demais.' } });
  }
  if (!config.isTest) console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: 'Erro interno do servidor.' } });
}

module.exports = { notFound, errorHandler };
