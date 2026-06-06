const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.login(req.body);
  res.status(result.statusCode).json(result);
});

const logout = asyncHandler(async (req, res) => {
  const result = await usecase.employeeLoginMaster.logout();
  res.status(result.statusCode).json(result);
});

module.exports = { list, getById, create, update, remove, login, logout };
