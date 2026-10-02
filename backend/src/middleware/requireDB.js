const { isDBConnected } = require('../config/db');
const ApiError = require('../utils/ApiError');

// Reject requests that need MongoDB while the connection is down.
module.exports = (req, res, next) => {
  if (!isDBConnected()) return next(ApiError.serviceUnavailable('database not connected'));
  next();
};
