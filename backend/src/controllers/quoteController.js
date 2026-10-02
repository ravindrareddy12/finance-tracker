const quoteService = require('../services/quoteService');
const ApiError     = require('../utils/ApiError');
const { parseList } = require('../utils/query');

// GET /api/quotes?symbols=AAPL,MSFT
async function getQuotes(req, res) {
  if (!req.query.symbols) throw ApiError.badRequest('symbols required');
  const symbols = parseList(req.query.symbols, { unique: true });
  const result  = await quoteService.getQuotes(symbols);
  res.json({ quoteResponse: { result, error: null } });
}

module.exports = { getQuotes };
