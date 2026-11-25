const { Router } = require('express');
const { z } = require('zod');
const validate = require('../middleware/validate');
const authService = require('../services/authService');
const config = require('../config');

const router = Router();

const email = z.string().trim().toLowerCase().email('E-mail inválido.').max(254);
const password = z.string().min(8, 'A senha deve ter no mínimo 8 caracteres.').max(72, 'A senha deve ter no máximo 72 caracteres.');
const refreshBody = z.object({ refreshToken: z.string().min(20) });

router.post('/register', validate({
  body: z.object({ name: z.string().trim().min(2, 'Informe seu nome.').max(120), email, password }),
}), async (req, res) => {
  res.status(201).json(await authService.register(req.valid.body));
});

router.post('/login', validate({
  body: z.object({ email, password: z.string().min(1).max(72) }),
}), async (req, res) => {
  res.json(await authService.login(req.valid.body));
});

router.post('/refresh', validate({ body: refreshBody }), async (req, res) => {
  res.json({ tokens: await authService.refresh(req.valid.body.refreshToken) });
});

router.post('/logout', validate({ body: refreshBody }), async (req, res) => {
  await authService.logout(req.valid.body.refreshToken);
  res.status(204).end();
});

router.post('/forgot-password', validate({ body: z.object({ email }) }), async (req, res) => {
  const token = await authService.forgotPassword(req.valid.body.email);
  res.status(202).json({
    message: 'Se o e-mail estiver cadastrado, enviaremos as instruções de recuperação.',
    ...(config.exposeResetToken && token && { resetToken: token }), // somente em desenvolvimento
  });
});

router.post('/reset-password', validate({
  body: z.object({ token: z.string().min(20), newPassword: password }),
}), async (req, res) => {
  await authService.resetPassword(req.valid.body);
  res.status(204).end();
});

module.exports = router;
