const quoteService = require('../services/quoteService');
const { isDBConnected } = require('../config/db');

// GET /api/health
function getHealth(req, res) {
  res.json({
    status:        'ok',
    database:      isDBConnected() ? 'connected' : 'disconnected',
    cachedSymbols: quoteService.getCacheSize(),
    engine:        quoteService.ENGINE,
  });
}

module.exports = { getHealth };
