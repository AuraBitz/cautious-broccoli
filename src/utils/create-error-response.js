const createErrorResponse = ({
  statusCode = 500,
  message = 'Internal Server Error',
  errors = null,
  code = null,
}) => ({
  success: false,
  statusCode,
  message,
  ...(code && { code }),
  ...(errors && { errors }),
});

module.exports = createErrorResponse;
