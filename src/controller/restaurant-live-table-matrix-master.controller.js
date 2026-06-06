const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantLiveTableMatrixMaster.list(
    buildListPayload(req.body)
  );
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantLiveTableMatrixMaster.getById(
    parseId(req.params.id)
  );
  res.status(result.statusCode).json(result);
});

const getByRestaurantId = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantLiveTableMatrixMaster.getByRestaurantId(
    parseId(req.params.restaurantId)
  );
  res.status(result.statusCode).json(result);
});

const getPublicByRestaurantId = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantLiveTableMatrixMaster.getPublicByRestaurantId(
    parseId(req.params.restaurantId)
  );
  res.status(result.statusCode).json(result);
});

const upsertByRestaurantId = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantLiveTableMatrixMaster.upsertByRestaurantId(
    parseId(req.params.restaurantId),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantLiveTableMatrixMaster.remove(
    parseId(req.params.id)
  );
  res.status(result.statusCode).json(result);
});

module.exports = {
  list,
  getById,
  getByRestaurantId,
  getPublicByRestaurantId,
  upsertByRestaurantId,
  remove,
};
