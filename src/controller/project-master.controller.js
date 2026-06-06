const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.projectMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const list = asyncHandler(async (req, res) => {
  const result = await usecase.projectMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.projectMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.projectMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.projectMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const getPortalModules = asyncHandler(async (req, res) => {
  const roleMasterId = req.query.roleId ?? req.query.roleMasterId ?? null;
  const planId =
    req.query.planId !== undefined && req.query.planId !== ''
      ? Number(req.query.planId)
      : null;
  const result = await usecase.projectMaster.getPortalModules(
    parseId(req.params.id),
    roleMasterId != null ? Number(roleMasterId) : null,
    planId
  );
  res.status(result.statusCode).json(result);
});

module.exports = { list, getById, create, update, remove, getPortalModules };
