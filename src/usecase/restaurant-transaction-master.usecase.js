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

const repo = dataaccess.restaurantTransactionMaster;
const customerRepo = dataaccess.restaurantCustomerManagement;

const createSchema = Joi.object({
  customer_id: Joi.number().integer().positive().required(),
  account_number: Joi.string().trim().max(100).allow(null, ''),
  bank_name: Joi.string().trim().max(255).allow(null, ''),
  transaction_at: Joi.date().iso().allow(null),
  transaction_by: Joi.string().trim().max(255).allow(null, ''),
});

const updateSchema = Joi.object({
  account_number: Joi.string().trim().max(100).allow(null, ''),
  bank_name: Joi.string().trim().max(255).allow(null, ''),
  transaction_at: Joi.date().iso().allow(null),
  transaction_by: Joi.string().trim().max(255).allow(null, ''),
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant transaction list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant transaction not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant transaction fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  const customer = await customerRepo.findById(data.customer_id);
  if (!customer) {
    throw new AppError('Restaurant customer not found', 400, 'INVALID_CUSTOMER');
  }
  const row = await repo.create({
    ...data,
    account_number: data.account_number || null,
    bank_name: data.bank_name || null,
    transaction_by: data.transaction_by || null,
  });
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant transaction created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant transaction not found', 404, 'NOT_FOUND');
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant transaction updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant transaction not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant transaction deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
