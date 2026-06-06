const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.projectRoleMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.projectRoleMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.projectRoleMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.projectRoleMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.projectRoleMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const listByProject = asyncHandler(async (req, res) => {
  const result = await usecase.projectRoleMaster.listByProject(
    parseId(req.params.projectId)
  );
  res.status(result.statusCode).json(result);
});

module.exports = { list, getById, create, update, remove, listByProject };
