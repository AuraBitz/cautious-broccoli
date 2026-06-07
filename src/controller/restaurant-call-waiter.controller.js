const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantCallWaiter.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantCallWaiter.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const listRecentByRestaurant = asyncHandler(async (req, res) => {
  const minutes = req.query.minutes ? parseId(req.query.minutes) : 30;
  const result = await usecase.restaurantCallWaiter.listRecentByRestaurant(
    parseId(req.params.restaurantId),
    minutes
  );
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantCallWaiter.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantCallWaiter.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantCallWaiter.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

module.exports = {
  list,
  getById,
  listRecentByRestaurant,
  create,
  update,
  remove,
};
