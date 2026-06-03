const logger = require('../logger');
const { createErrorResponse } = require('../utils');

const errorHandlerMiddleware = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  const context = req.context;

  logger.error('API Error', {
    requestId: context?.requestId,
    method: context?.method,
    path: context?.path,
    statusCode,
    message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
    ip: context?.ip,
    device: context?.device,
    browser: context?.browser,
    location: context?.location,
  });

  res.status(statusCode).json(
    createErrorResponse({
      statusCode,
      message,
      code: err.code || null,
      errors: err.errors || null,
    })
  );
};

module.exports = errorHandlerMiddleware;
