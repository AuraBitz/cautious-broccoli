const AppError = require('./app-error');

const formatJoiMessage = (error) =>
  error.details.map((d) => d.message.replace(/"/g, '')).join(', ');

const validateSchema = (schema, data, options = {}) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
    ...options,
  });

  if (error) {
    throw new AppError(formatJoiMessage(error), 400, 'VALIDATION_ERROR', {
      fields: error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message,
      })),
    });
  }

  return value;
};

module.exports = { validateSchema, formatJoiMessage };
