const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const wallet = require('../services/walletService');

// Header obrigatório: o app gera um valor único (ex.: UUID) a cada toque do usuário e o reenvia em caso de nova tentativa.
const headers = z.object({
  'idempotency-key': z.string({ error: 'Envie o header Idempotency-Key.' })
    .regex(/^[A-Za-z0-9_.:-]{8,100}$/, 'Idempotency-Key deve ter de 8 a 100 caracteres (letras, números, _ . : -).'),
});

const respond = (res, { transaction, replayed }) =>
  res.status(replayed ? 200 : 201).json({ transaction, replayed });

const recharges = Router();
recharges.post('/', validate({
  headers,
  body: z.object({ amountCents: z.number({ error: 'amountCents deve ser um número inteiro (centavos).' }).int().positive() }),
}), async (req, res) => {
  respond(res, await wallet.recharge(req.user.id, req.valid.body.amountCents, req.valid.headers['idempotency-key']));
});

const payments = Router();
// MVP: a passagem é debitada da carteira do próprio usuário (simulação). O valor é definido pelo servidor, nunca pelo app.
payments.post('/fare', validate({ headers }), async (req, res) => {
  respond(res, await wallet.payFare(req.user.id, req.valid.headers['idempotency-key']));
});

module.exports = { recharges, payments };
