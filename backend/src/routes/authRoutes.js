const router = require('express').Router();
const asyncHandler   = require('../utils/asyncHandler');
const requireDB      = require('../middleware/requireDB');
const authenticate   = require('../middleware/authenticate');
const rateLimit      = require('../middleware/rateLimit');
const authController = require('../controllers/authController');

const credentialLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

router.use(requireDB);
router.post('/register',       credentialLimiter, asyncHandler(authController.register));
router.post('/login',          credentialLimiter, asyncHandler(authController.login));
router.post('/reset-password', credentialLimiter, asyncHandler(authController.resetPassword));
router.get('/me',              authenticate,      authController.me);

module.exports = router;
