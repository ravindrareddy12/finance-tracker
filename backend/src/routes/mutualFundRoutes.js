const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const mutualFundController = require('../controllers/mutualFundController');

router.get('/search',       asyncHandler(mutualFundController.search));
router.get('/nav',          asyncHandler(mutualFundController.getNav));
router.get('/nav-on-dates', asyncHandler(mutualFundController.getNavOnDates));

module.exports = router;
