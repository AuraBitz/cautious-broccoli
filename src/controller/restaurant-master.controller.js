const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const {
  parseId,
  buildListPayload,
  withActor,
} = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.create(
    withActor(req.body, req.user)
  );
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const publicList = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.publicList(req.body);
  res.status(result.statusCode).json(result);
});

const publicGetById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantMaster.publicGetById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  publicList,
  publicGetById,
};
