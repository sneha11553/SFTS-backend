const { getConfig } = require('./config');

module.exports = function corsMiddleware(req, res, next) {
  const origin = req.headers.origin;
  const allowed = (getConfig('CORS_ORIGINS') || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);

  if (origin && !allowed.includes(origin)) {
    return res.status(403).json({ error: 'Origin not allowed by CORS' });
  }
  if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  return next();
};