const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMenuMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMenuMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMenuMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMenuMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMenuMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const listByRestaurant = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMenuMaster.listByRestaurant(
    parseId(req.params.restaurantId)
  );
  res.status(result.statusCode).json(result);
});

module.exports = { list, getById, create, update, remove, listByRestaurant };
