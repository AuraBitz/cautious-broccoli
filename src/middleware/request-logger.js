const logger = require('../logger');

const requestLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  const { context } = req;

  logger.info('API Request', {
    requestId: context?.requestId,
    method: context?.method,
    path: context?.path,
    ip: context?.ip,
    device: context?.device,
    browser: context?.browser,
    location: context?.location,
  });

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level = res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]('API Response', {
      requestId: context?.requestId,
      method: context?.method,
      path: context?.path,
      statusCode: res.statusCode,
      durationMs,
      ip: context?.ip,
      device: context?.device,
      browser: context?.browser,
      location: context?.location,
    });
  });

  next();
};

module.exports = requestLoggerMiddleware;
