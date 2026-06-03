const { v4: uuidv4 } = require('uuid');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');

const getClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) {
    return String(forwarded).split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
};

const buildRequestContext = (req) => {
  const requestId = uuidv4();
  const ip = getClientIp(req);
  const ua = new UAParser(req.headers['user-agent'] || '');
  const parsed = ua.getResult();
  const geo = geoip.lookup(ip);

  return {
    requestId,
    ip,
    device: {
      type: parsed.device?.type || 'desktop',
      vendor: parsed.device?.vendor || null,
      model: parsed.device?.model || null,
      os: parsed.os?.name
        ? `${parsed.os.name} ${parsed.os.version || ''}`.trim()
        : null,
    },
    browser: parsed.browser?.name
      ? `${parsed.browser.name} ${parsed.browser.version || ''}`.trim()
      : null,
    location: geo
      ? {
          country: geo.country,
          region: geo.region,
          city: geo.city,
          timezone: geo.timezone,
          ll: geo.ll,
        }
      : null,
    method: req.method,
    path: req.originalUrl || req.url,
    userAgent: req.headers['user-agent'] || null,
  };
};

const requestContextMiddleware = (req, res, next) => {
  req.context = buildRequestContext(req);
  res.setHeader('X-Request-Id', req.context.requestId);
  next();
};

module.exports = { requestContextMiddleware, buildRequestContext, getClientIp };
