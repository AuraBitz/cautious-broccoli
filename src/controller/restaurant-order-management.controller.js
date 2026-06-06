const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderManagement.list(
    buildListPayload(req.body)
  );
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderManagement.getById(
    parseId(req.params.id)
  );
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderManagement.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderManagement.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderManagement.remove(
    parseId(req.params.id)
  );
  res.status(result.statusCode).json(result);
});

module.exports = { list, getById, create, update, remove };
