const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const youtubeController = require('../controllers/youtubeController');

router.get('/', asyncHandler(youtubeController.getChannels));

module.exports = router;
