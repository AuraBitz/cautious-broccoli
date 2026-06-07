const usecase = require('../usecase');
const { asyncHandler } = require('../utils');
const { parseId, buildListPayload } = require('./payload/request.payload');

const list = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.list(buildListPayload(req.body));
  res.status(result.statusCode).json(result);
});

const getById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.getById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const create = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const update = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.update(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

const remove = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.remove(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const publicCreate = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.create(req.body);
  res.status(result.statusCode).json(result);
});

const publicGetActive = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.getActive({
    restaurant_id: req.query.restaurant_id,
    table_id: req.query.table_id,
    customer_id: req.query.customer_id,
  });
  res.status(result.statusCode).json(result);
});

const publicEnsureActive = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.ensureActive(req.body);
  res.status(result.statusCode).json(result);
});

const publicGetById = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.publicGetById(parseId(req.params.id));
  res.status(result.statusCode).json(result);
});

const publicUpdate = asyncHandler(async (req, res) => {
  const result = await usecase.restaurantOrderMaster.publicUpdate(
    parseId(req.params.id),
    req.body
  );
  res.status(result.statusCode).json(result);
});

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  publicCreate,
  publicEnsureActive,
  publicGetById,
  publicGetActive,
  publicUpdate,
};
