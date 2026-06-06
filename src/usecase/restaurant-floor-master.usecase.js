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

const repo = dataaccess.restaurantFloorMaster;
const restaurantRepo = dataaccess.restaurantMaster;

const createSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  floor_no: Joi.number().integer().required(),
});

const updateSchema = Joi.object({
  floor_no: Joi.number().integer(),
}).min(1);

const assertRestaurantExists = async (restaurantId) => {
  const exists = await restaurantRepo.existsById(restaurantId);
  if (!exists) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant floor list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant floor not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant floor fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertRestaurantExists(data.restaurant_id);
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant floor created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant floor not found', 404, 'NOT_FOUND');
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant floor updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant floor not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant floor deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
