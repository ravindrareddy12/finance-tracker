const User     = require('../models/User');
const ApiError = require('../utils/ApiError');
const { signToken } = require('./tokenService');

const MIN_PASSWORD_LENGTH = 6;
const USERNAME_PATTERN    = /^[A-Za-z0-9_.-]{3,40}$/;

function validatePassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    throw ApiError.badRequest(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }
}

const session = (user) => ({ token: signToken(user), user: user.toPublic() });

async function register({ username, password, passwordHint }) {
  username = String(username ?? '').trim();
  if (!USERNAME_PATTERN.test(username)) {
    throw ApiError.badRequest('Username must be 3–40 characters: letters, numbers, . _ -');
  }
  validatePassword(password);
  if (await User.exists({ username })) throw ApiError.conflict('Username already exists. Please choose another.');

  const user = new User({ username });
  await user.setPassword(password);
  await user.setHint(passwordHint);
  await user.save();
  return session(user);
}

async function login({ username, password }) {
  const user = await User.findOne({ username: String(username ?? '').trim() });
  if (!user || !(await user.comparePassword(String(password ?? '')))) {
    throw ApiError.unauthorized('Invalid username or password.');
  }
  return session(user);
}

// Reset a forgotten password by answering the password hint
async function resetPassword({ username, passwordHint, newPassword }) {
  validatePassword(newPassword);
  const user = await User.findOne({ username: String(username ?? '').trim() });
  if (!user || !(await user.compareHint(passwordHint))) {
    throw ApiError.unauthorized('Username or password hint is incorrect.');
  }
  await user.setPassword(newPassword);
  await user.save();
}

module.exports = { register, login, resetPassword };
