const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { query } = require('../db');
const txs = require('../services/transactionService');
const wallet = require('../services/walletService');
const { toUser, toCard } = require('../utils/serializers');
const { paginationSchema, meta } = require('../utils/pagination');

const router = Router();

router.get('/users', validate({
  query: z.object({ ...paginationSchema, search: z.string().trim().max(100).optional() }),
}), async (req, res) => {
  const { page, limit, search } = req.valid.query;
  const params = []; let where = 'true';
  if (search) { params.push(`%${search}%`); where = `(u.name ILIKE $1 OR u.email ILIKE $1)`; }
  const { rows: c } = await query(`SELECT count(*)::int AS n FROM users u WHERE ${where}`, params);
  const { rows } = await query(
    `SELECT u.*, c.id AS card_id, c.card_number, c.status AS card_status
       FROM users u LEFT JOIN cards c ON c.user_id = u.id WHERE ${where}
      ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, (page - 1) * limit]
  );
  res.json({
    data: rows.map((r) => ({ ...toUser(r), card: r.card_id ? { id: r.card_id, cardNumber: r.card_number, status: r.card_status } : null })),
    pagination: meta(page, limit, c[0].n),
  });
});

router.get('/transactions', validate({
  query: z.object({
    ...paginationSchema,
    type: z.enum(['recharge', 'payment']).optional(),
    from: z.coerce.date().optional(), to: z.coerce.date().optional(),
    cardNumber: z.string().trim().max(20).optional(),
  }),
}), async (req, res) => {
  res.json(await txs.listAll(req.valid.query));
});

// Administradores bloqueiam/desbloqueiam cartões, mas NÃO alteram saldo (regra de integridade financeira).
router.patch('/cards/:id/status', validate({
  params: z.object({ id: z.string().uuid() }),
  body: z.object({ status: z.enum(['active', 'blocked']) }),
}), async (req, res) => {
  res.json({ card: await wallet.setCardStatusById(req.user, req.valid.params.id, req.valid.body.status) });
});

router.get('/stats', async (req, res) => {
  const [users, cards, moves] = await Promise.all([
    query(`SELECT count(*) FILTER (WHERE role = 'passenger')::int AS passengers FROM users`),
    query(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'blocked')::int AS blocked FROM cards`),
    query(`SELECT
             COALESCE(sum(amount_cents) FILTER (WHERE type = 'recharge'), 0)::bigint AS recharged,
             COALESCE(sum(amount_cents) FILTER (WHERE type = 'payment'), 0)::bigint AS spent,
             count(*) FILTER (WHERE type = 'recharge')::int AS recharges,
             count(*) FILTER (WHERE type = 'payment')::int AS payments,
             count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today
           FROM transactions`),
  ]);
  res.json({
    stats: {
      passengers: users.rows[0].passengers,
      cards: { total: cards.rows[0].total, blocked: cards.rows[0].blocked },
      transactions: {
        rechargesCount: moves.rows[0].recharges, paymentsCount: moves.rows[0].payments,
        totalRechargedCents: Number(moves.rows[0].recharged), totalSpentCents: Number(moves.rows[0].spent),
        today: moves.rows[0].today,
      },
    },
  });
});

module.exports = router;
