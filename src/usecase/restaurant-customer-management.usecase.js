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

const repo = dataaccess.restaurantCustomerManagement;
const restaurantRepo = dataaccess.restaurantMaster;

const createSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().trim().min(1).max(255).required(),
  email: Joi.string().trim().email().allow(null, ''),
  phone: Joi.string().trim().max(50).allow(null, ''),
  customer_login_id: Joi.number().integer().positive().allow(null),
  is_not_login: Joi.boolean().default(true),
  current_status: Joi.string().trim().max(50).default('active'),
  is_manual_booking: Joi.boolean().default(false),
  address: Joi.string().trim().allow(null, ''),
});

const updateSchema = Joi.object({
  customer_name: Joi.string().trim().min(1).max(255),
  email: Joi.string().trim().email().allow(null, ''),
  phone: Joi.string().trim().max(50).allow(null, ''),
  customer_login_id: Joi.number().integer().positive().allow(null),
  is_not_login: Joi.boolean(),
  current_status: Joi.string().trim().max(50),
  is_manual_booking: Joi.boolean(),
  address: Joi.string().trim().allow(null, ''),
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
  return listResponse('Restaurant customer list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant customer not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant customer fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertRestaurantExists(data.restaurant_id);
  const row = await repo.create({
    ...data,
    email: data.email || null,
    phone: data.phone || null,
    address: data.address || null,
  });
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant customer created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant customer not found', 404, 'NOT_FOUND');
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant customer updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant customer not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant customer deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
