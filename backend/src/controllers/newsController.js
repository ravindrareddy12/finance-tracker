const newsService   = require('../services/newsService');
const ApiError      = require('../utils/ApiError');
const { parseList } = require('../utils/query');

// GET /api/news?symbols=AAPL,MSFT
async function getNews(req, res) {
  if (!req.query.symbols) throw ApiError.badRequest('symbols required');
  const symbols = parseList(req.query.symbols, { unique: true, upper: true });
  res.json({ digests: symbols.length ? await newsService.getDigests(symbols) : [] });
}

module.exports = { getNews };
