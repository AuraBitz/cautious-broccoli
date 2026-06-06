const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, optionalMasterStatusSchema } =
  require('./common.schemas');

const repo = dataaccess.paymentTypeMaster;

const createSchema = Joi.object({
  type: Joi.string().trim().min(1).max(100).required(),
  status: optionalMasterStatusSchema.default('active'),
  created_by: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  type: Joi.string().trim().min(1).max(100),
  status: optionalMasterStatusSchema,
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Payment type list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Payment type not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Payment type fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Payment type created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Payment type not found', 404, 'NOT_FOUND');
  }
  const row = await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Payment type updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Payment type not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Payment type deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
