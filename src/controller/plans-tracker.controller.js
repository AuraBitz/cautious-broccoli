const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.plansTracker.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getPlan = asyncHandler(async (req, res) => {
  const result = await usecase.plansTracker.getPlan(req.body);
  res.status(result.statusCode).json(result);
});

module.exports = { list, getPlan };
