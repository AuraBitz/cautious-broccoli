const createSuccessResponse = require('./create-success-response');

const listResponse = (message, result) =>
  createSuccessResponse({
    message,
    data: result.rows,
    meta: {
      total: result.total,
      skip: result.skip,
      limit: result.limit,
      sort: result.sort,
    },
  });

const itemResponse = (message, data, statusCode = 200) =>
  createSuccessResponse({ statusCode, message, data });

const deleteResponse = (message, id) =>
  createSuccessResponse({ message, data: { id } });

module.exports = { listResponse, itemResponse, deleteResponse };
