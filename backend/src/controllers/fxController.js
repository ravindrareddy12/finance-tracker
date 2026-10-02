const fxService = require('../services/fxService');
const ApiError  = require('../utils/ApiError');

// GET /api/fx/usd-inr
async function getUsdInr(req, res) {
  const result = await fxService.getUsdInrRate();
  if (!result) throw ApiError.serviceUnavailable('FX rate unavailable');
  res.json(result);
}

module.exports = { getUsdInr };
