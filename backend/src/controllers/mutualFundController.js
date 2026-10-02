const mutualFundService = require('../services/mutualFundService');
const ApiError          = require('../utils/ApiError');
const { parseList }     = require('../utils/query');

// GET /api/mf/search?q=parag
async function search(req, res) {
  const { q } = req.query;
  if (!q) throw ApiError.badRequest('q required');
  res.json(await mutualFundService.searchFunds(q));
}

// GET /api/mf/nav?codes=122639,120503
async function getNav(req, res) {
  const { codes } = req.query;
  if (!codes) throw ApiError.badRequest('codes required');
  const results = await mutualFundService.getNavsByCodes(parseList(codes));
  res.json({ results });
}

// GET /api/mf/nav-on-dates?code=122639&dates=2024-01-05,2024-02-05
async function getNavOnDates(req, res) {
  const { code, dates } = req.query;
  if (!code || !dates) throw ApiError.badRequest('code and dates required');
  try {
    res.json(await mutualFundService.getNavsOnDates(code, parseList(dates)));
  } catch (err) {
    if (err.name === 'AbortError') throw ApiError.timeout('Timeout fetching historical NAV data');
    throw err;
  }
}

module.exports = { search, getNav, getNavOnDates };
