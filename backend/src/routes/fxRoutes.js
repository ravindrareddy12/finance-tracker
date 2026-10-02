const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const fxController = require('../controllers/fxController');

router.get('/usd-inr', asyncHandler(fxController.getUsdInr));

module.exports = router;
