const User     = require('../models/User');
const ApiError = require('../utils/ApiError');
const { verifyToken } = require('../services/tokenService');

// Requires `Authorization: Bearer <token>`; attaches the user document as req.user.
module.exports = async (req, res, next) => {
  try {
    const [scheme, token] = (req.headers.authorization ?? '').split(' ');
    if (scheme !== 'Bearer' || !token) throw ApiError.unauthorized('Authentication required');

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw ApiError.unauthorized('Session expired, please sign in again');
    }

    const user = await User.findById(payload.sub);
    if (!user) throw ApiError.unauthorized('Account no longer exists');

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};
