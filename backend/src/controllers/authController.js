const authService = require('../services/authService');

// POST /api/auth/register — body: { username, password, passwordHint? }
async function register(req, res) {
  res.status(201).json(await authService.register(req.body ?? {}));
}

// POST /api/auth/login — body: { username, password }
async function login(req, res) {
  res.json(await authService.login(req.body ?? {}));
}

// GET /api/auth/me — validates the token and returns the signed-in user
function me(req, res) {
  res.json({ user: req.user.toPublic() });
}

// POST /api/auth/reset-password — body: { username, passwordHint, newPassword }
async function resetPassword(req, res) {
  await authService.resetPassword(req.body ?? {});
  res.json({ ok: true });
}

module.exports = { register, login, me, resetPassword };
