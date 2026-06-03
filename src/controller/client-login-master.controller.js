const usecase = require('../usecase');
const config = require('../config/Development');
const { asyncHandler, cookieOptions } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.list(
    buildListPayload(req.body)
  );
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const login = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.login(req.body);
  res
    .cookie(
      config.cookie.name,
      result.data.token,
      cookieOptions.getAccessTokenCookieOptions()
    )
    .status(result.statusCode)
    .json(result);
});

const logout = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.logout();
  res
    .clearCookie(config.cookie.name, cookieOptions.getClearCookieOptions())
    .status(result.statusCode)
    .json(result);
});

const me = asyncHandler(async (req, res) => {
  const result = await usecase.clientLoginMaster.me(req.user.id);
  res.status(result.statusCode).json(result);
});

module.exports = { list, create, update, remove, login, logout, me };
