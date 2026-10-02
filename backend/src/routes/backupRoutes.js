const router = require('express').Router();
const asyncHandler = require('../utils/asyncHandler');
const requireDB    = require('../middleware/requireDB');
const authenticate = require('../middleware/authenticate');
const backupController = require('../controllers/backupController');

router.use(requireDB, authenticate);
router.get('/',  asyncHandler(backupController.getBackup));
router.post('/', asyncHandler(backupController.saveBackup));

module.exports = router;
