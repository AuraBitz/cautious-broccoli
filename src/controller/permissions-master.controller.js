const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.permissionsMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.permissionsMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.permissionsMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.permissionsMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.permissionsMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

module.exports = { list, getById, create, update, remove };
