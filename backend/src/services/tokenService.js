const jwt    = require('jsonwebtoken');
const config = require('../config');

function signToken(user) {
  return jwt.sign({ sub: user._id.toString(), username: user.username }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

// Returns the decoded payload, or throws if the token is invalid/expired
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signToken, verifyToken };
