const ApiError = require('../utils/ApiError');

// Minimal in-memory fixed-window limiter (single process), used to slow down
// password and hint guessing. Behind Cloudflare the real client IP is in
// CF-Connecting-IP.
module.exports = function rateLimit({ windowMs, max, message = 'Too many attempts, please try again later.' }) {
  const hits = new Map(); // ip → { count, resetAt }

  setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of hits) if (entry.resetAt <= now) hits.delete(ip);
  }, windowMs).unref();

  return (req, res, next) => {
    const ip  = req.headers['cf-connecting-ip'] || req.ip;
    const now = Date.now();
    let entry = hits.get(ip);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(ip, entry);
    }
    entry.count += 1;
    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(ApiError.tooManyRequests(message));
    }
    next();
  };
};
