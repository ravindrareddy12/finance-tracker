const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const quoteController = require('../controllers/quoteController');

router.get('/', asyncHandler(quoteController.getQuotes));

module.exports = router;
