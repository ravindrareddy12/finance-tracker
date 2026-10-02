const router = require('express').Router();
const { getHealth } = require('../controllers/healthController');

router.get('/health', getHealth);
router.use('/auth',    require('./authRoutes'));
router.use('/quotes',  require('./quoteRoutes'));
router.use('/mf',      require('./mutualFundRoutes'));
router.use('/fx',      require('./fxRoutes'));
router.use('/news',    require('./newsRoutes'));
router.use('/youtube', require('./youtubeRoutes'));
router.use('/backup',  require('./backupRoutes'));

module.exports = router;
