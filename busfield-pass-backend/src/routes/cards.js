const { Router } = require('express');
const wallet = require('../services/walletService');
const { toCard } = require('../utils/serializers');

const router = Router();

router.get('/me', async (req, res) => {
  res.json({ card: toCard(await wallet.getCardWithWallet(req.user.id)) });
});
router.post('/me/block', async (req, res) => {
  res.json({ card: await wallet.setOwnCardStatus(req.user, 'blocked') });
});
router.post('/me/unblock', async (req, res) => {
  res.json({ card: await wallet.setOwnCardStatus(req.user, 'active') });
});

module.exports = router;
