const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema } = require('./common.schemas');

const repo = dataaccess.restaurantLiveTableMatrixMaster;
const restaurantRepo = dataaccess.restaurantMaster;
const { reconcileMatrixWithBookings } = require('../utils/live-matrix-sync');

const matrixSchema = Joi.object({
  version: Joi.number().integer().optional(),
  activeFloorId: Joi.string().allow('').optional(),
  floors: Joi.array().items(Joi.object()).optional(),
}).unknown(true);

const upsertSchema = Joi.object({
  matrix: matrixSchema.required(),
});

const assertRestaurantExists = async (restaurantId) => {
  const exists = await restaurantRepo.existsById(restaurantId);
  if (!exists) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Live table matrix list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Live table matrix not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Live table matrix fetched', row);
};

const getByRestaurantId = async (restaurantId) => {
  await assertRestaurantExists(restaurantId);
  const row = await reconcileMatrixWithBookings(restaurantId);
  if (!row) {
    return itemResponse('Live table matrix not found', null);
  }
  return itemResponse('Live table matrix fetched', row);
};

const getPublicByRestaurantId = async (restaurantId) => getByRestaurantId(restaurantId);

const upsertByRestaurantId = async (restaurantId, payload) => {
  const data = validateSchema(upsertSchema, payload);
  await assertRestaurantExists(restaurantId);
  const row = await repo.upsertByRestaurantId(restaurantId, data.matrix);
  return itemResponse('Live table matrix saved', row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Live table matrix not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Live table matrix deleted', deleted.id);
};

module.exports = {
  list,
  getById,
  getByRestaurantId,
  getPublicByRestaurantId,
  upsertByRestaurantId,
  remove,
};
