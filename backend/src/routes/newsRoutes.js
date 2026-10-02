const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const newsController = require('../controllers/newsController');

router.get('/', asyncHandler(newsController.getNews));

module.exports = router;
