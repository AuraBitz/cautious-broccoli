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

const repo = dataaccess.restaurantOrderManagement;
const restaurantRepo = dataaccess.restaurantMaster;
const tableRepo = dataaccess.restaurantTableMaster;
const transactionRepo = dataaccess.restaurantTransactionMaster;

const intArraySchema = Joi.array().items(Joi.number().integer().positive()).default([]);

const createSchema = Joi.object({
  table_id: Joi.number().integer().positive().allow(null),
  restaurant_id: Joi.number().integer().positive().required(),
  menu_id: intArraySchema,
  item_id: intArraySchema,
  amount: Joi.number().min(0).default(0),
  status: Joi.string().trim().max(50).default('pending'),
  customer_transaction_id: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  table_id: Joi.number().integer().positive().allow(null),
  menu_id: intArraySchema,
  item_id: intArraySchema,
  amount: Joi.number().min(0),
  status: Joi.string().trim().max(50),
  customer_transaction_id: Joi.number().integer().positive().allow(null),
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant order list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant order fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  if (!(await restaurantRepo.existsById(data.restaurant_id))) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  if (data.customer_transaction_id) {
    const txn = await transactionRepo.findById(data.customer_transaction_id);
    if (!txn) {
      throw new AppError('Customer transaction not found', 400, 'INVALID_TRANSACTION');
    }
  }
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant order created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  if (data.customer_transaction_id) {
    const txn = await transactionRepo.findById(data.customer_transaction_id);
    if (!txn) {
      throw new AppError('Customer transaction not found', 400, 'INVALID_TRANSACTION');
    }
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant order updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant order deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
