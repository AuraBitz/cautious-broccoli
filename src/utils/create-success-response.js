const createSuccessResponse = ({
  statusCode = 200,
  message = 'Success',
  data = null,
  meta = null,
}) => ({
  success: true,
  statusCode,
  message,
  data,
  ...(meta && { meta }),
});

module.exports = createSuccessResponse;
