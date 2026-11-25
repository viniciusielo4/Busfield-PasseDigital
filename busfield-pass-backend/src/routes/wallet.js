const { Router } = require('express');
const wallet = require('../services/walletService');

const router = Router();
router.get('/', async (req, res) => {
  res.json({ wallet: await wallet.getWalletSummary(req.user.id) });
});
module.exports = router;
