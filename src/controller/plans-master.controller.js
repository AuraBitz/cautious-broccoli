const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const {
  parseId,
  buildListPayload,
  withActor,
} = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.plansMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.plansMaster.create(
    withActor(req.body, req.user)
  );
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.plansMaster.update(
    parseId(req.params.id),
    withActor(req.body, req.user)
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.plansMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

module.exports = { list, create, update, remove };
