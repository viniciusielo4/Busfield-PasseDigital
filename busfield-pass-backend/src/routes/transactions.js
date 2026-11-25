const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const svc = require('../services/transactionService');
const { paginationSchema } = require('../utils/pagination');

const router = Router();

const period = {
  type: z.enum(['recharge', 'payment']).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

router.get('/', validate({ query: z.object({ ...paginationSchema, ...period }) }), async (req, res) => {
  res.json(await svc.listForUser(req.user.id, req.valid.query));
});

router.get('/summary', validate({ query: z.object(period) }), async (req, res) => {
  res.json({ summary: await svc.summaryForUser(req.user.id, req.valid.query) });
});

router.get('/:id', validate({ params: z.object({ id: z.string().uuid() }) }), async (req, res) => {
  res.json({ receipt: await svc.getReceipt(req.user.id, req.valid.params.id) });
});

module.exports = router;
