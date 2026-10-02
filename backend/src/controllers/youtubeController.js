const youtubeService = require('../services/youtubeService');
const ApiError       = require('../utils/ApiError');
const { parseList }  = require('../utils/query');

// GET /api/youtube?handles=@AkshatShrivastava,@SahilBhadviya
async function getChannels(req, res) {
  if (!req.query.handles) throw ApiError.badRequest('handles required');
  const channels = await youtubeService.getChannels(parseList(req.query.handles));
  res.json({ channels });
}

module.exports = { getChannels };
