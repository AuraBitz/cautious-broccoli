const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const {
  listQuerySchema,
  optionalMasterStatusSchema,
} = require('./common.schemas');

const repo = dataaccess.parentModulesMaster;

const createSchema = Joi.object({
  module_name: Joi.string().trim().min(1).required(),
  status: optionalMasterStatusSchema.default('active'),
});

const updateSchema = Joi.object({
  module_name: Joi.string().trim().min(1),
  status: optionalMasterStatusSchema,
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Parent module list fetched', result);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  const row = await repo.create(data);
  return itemResponse('Parent module created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Parent module not found', 404, 'NOT_FOUND');
  }
  const row = await repo.update(id, data);
  return itemResponse('Parent module updated', row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Parent module not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Parent module deleted', deleted.id);
};

module.exports = { list, create, update, remove };
