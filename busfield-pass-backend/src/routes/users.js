const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const { query } = require('../db');
const { AppError } = require('../errors');
const authService = require('../services/authService');
const { toUser } = require('../utils/serializers');

const router = Router();

router.get('/me', async (req, res) => {
  const { rows } = await query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: toUser(rows[0]) });
});

router.patch('/me', validate({
  body: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: z.string().trim().toLowerCase().email().max(254).optional(),
  }).refine((b) => b.name !== undefined || b.email !== undefined, { message: 'Informe ao menos um campo para atualizar.' }),
}), async (req, res) => {
  const { name, email } = req.valid.body;
  try {
    const { rows } = await query(
      `UPDATE users SET name = COALESCE($1, name), email = COALESCE($2, email), updated_at = now()
        WHERE id = $3 RETURNING *`, [name ?? null, email ?? null, req.user.id]
    );
    res.json({ user: toUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') throw new AppError(409, 'EMAIL_ALREADY_REGISTERED', 'Este e-mail já está cadastrado.');
    throw err;
  }
});

router.patch('/me/password', validate({
  body: z.object({ currentPassword: z.string().min(1).max(72), newPassword: z.string().min(8).max(72) }),
}), async (req, res) => {
  await authService.changePassword(req.user.id, req.valid.body);
  res.status(204).end();
});

module.exports = router;
