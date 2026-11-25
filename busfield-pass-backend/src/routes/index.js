const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');
const { recharges, payments } = require('./movements');

const router = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false,
  skip: () => !config.rateLimitEnabled,
  message: { error: { code: 'TOO_MANY_REQUESTS', message: 'Muitas tentativas. Aguarde alguns minutos.' } },
});

router.use('/auth', authLimiter, require('./auth'));
router.use('/users', authenticate, require('./users'));
router.use('/cards', authenticate, require('./cards'));
router.use('/wallet', authenticate, require('./wallet'));
router.use('/recharges', authenticate, recharges);
router.use('/payments', authenticate, payments);
router.use('/transactions', authenticate, require('./transactions'));
router.use('/bus-stops', authenticate, require('./busStops'));
router.use('/admin', authenticate, requireRole('admin'), require('./admin'));

module.exports = router;
