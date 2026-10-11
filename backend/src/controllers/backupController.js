const userDataService = require('../services/userDataService');
const ApiError        = require('../utils/ApiError');

// POST /api/backup — body: { data: { [localStorageKey]: value } }
// Only the signed-in user's own keys are stored.
async function saveBackup(req, res) {
  const { data } = req.body ?? {};
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw ApiError.badRequest('data required');
  const result = await userDataService.save(req.user, data);
  res.json({ ok: true, ...result });
}

// GET /api/backup — returns { savedAt, data, versions } for the signed-in user
async function getBackup(req, res) {
  res.json(await userDataService.load(req.user));
}

module.exports = { saveBackup, getBackup };
