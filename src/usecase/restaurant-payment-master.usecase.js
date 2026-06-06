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

const repo = dataaccess.restaurantPaymentMaster;
const orderRepo = dataaccess.restaurantOrderManagement;
const transactionRepo = dataaccess.restaurantTransactionMaster;

const createSchema = Joi.object({
  order_id: Joi.number().integer().positive().required(),
  transaction_id: Joi.number().integer().positive().allow(null),
  is_cash_amount: Joi.boolean().default(false),
  amount: Joi.number().min(0).default(0),
  payment_at: Joi.date().iso().allow(null),
});

const updateSchema = Joi.object({
  transaction_id: Joi.number().integer().positive().allow(null),
  is_cash_amount: Joi.boolean(),
  amount: Joi.number().min(0),
  payment_at: Joi.date().iso().allow(null),
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant payment list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant payment not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant payment fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  const order = await orderRepo.findById(data.order_id);
  if (!order) {
    throw new AppError('Restaurant order not found', 400, 'INVALID_ORDER');
  }
  if (data.transaction_id) {
    const txn = await transactionRepo.findById(data.transaction_id);
    if (!txn) {
      throw new AppError('Customer transaction not found', 400, 'INVALID_TRANSACTION');
    }
  }
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant payment created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant payment not found', 404, 'NOT_FOUND');
  }
  if (data.transaction_id) {
    const txn = await transactionRepo.findById(data.transaction_id);
    if (!txn) {
      throw new AppError('Customer transaction not found', 400, 'INVALID_TRANSACTION');
    }
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant payment updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant payment not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant payment deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
