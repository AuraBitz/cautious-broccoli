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

const repo = dataaccess.restaurantTableMaster;
const restaurantRepo = dataaccess.restaurantMaster;
const floorRepo = dataaccess.restaurantFloorMaster;

const createSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  floor_id: Joi.number().integer().positive().required(),
  table_number: Joi.string().trim().min(1).max(50).required(),
  chair_count: Joi.number().integer().min(0).default(0),
  booking_status: Joi.string().trim().max(50).default('available'),
});

const updateSchema = Joi.object({
  floor_id: Joi.number().integer().positive(),
  table_number: Joi.string().trim().min(1).max(50),
  chair_count: Joi.number().integer().min(0),
  booking_status: Joi.string().trim().max(50),
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant table list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant table not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant table fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  if (!(await restaurantRepo.existsById(data.restaurant_id))) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }
  const floor = await floorRepo.findById(data.floor_id);
  if (!floor || Number(floor.restaurant_id) !== Number(data.restaurant_id)) {
    throw new AppError('Floor not found for this restaurant', 400, 'INVALID_FLOOR');
  }
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant table created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant table not found', 404, 'NOT_FOUND');
  }
  if (data.floor_id !== undefined) {
    const floor = await floorRepo.findById(data.floor_id);
    if (!floor || Number(floor.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Floor not found for this restaurant', 400, 'INVALID_FLOOR');
    }
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant table updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant table not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant table deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
