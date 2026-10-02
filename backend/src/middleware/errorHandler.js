// Central error handler — every error response has the shape { error: message }.
// eslint-disable-next-line no-unused-vars
module.exports = (err, req, res, next) => {
  const status = err.statusCode || 500;
  if (status >= 500) console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  res.status(status).json({ error: err.message || 'Internal server error' });
};
