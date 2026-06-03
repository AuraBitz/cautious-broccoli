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

const repo = dataaccess.subModuleMaster;
const parentRepo = dataaccess.parentModulesMaster;

const createSchema = Joi.object({
  parent_module_id: Joi.number().integer().positive().required(),
  sub_module_name: Joi.string().trim().min(1).required(),
  status: optionalMasterStatusSchema.default('active'),
});

const updateSchema = Joi.object({
  parent_module_id: Joi.number().integer().positive(),
  sub_module_name: Joi.string().trim().min(1),
  status: optionalMasterStatusSchema,
}).min(1);

const assertParentExists = async (parentModuleId) => {
  const exists = await parentRepo.existsById(parentModuleId);
  if (!exists) {
    throw new AppError('parent_module_id not found', 400, 'INVALID_PARENT');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Sub module list fetched', result);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertParentExists(data.parent_module_id);
  const row = await repo.create(data);
  return itemResponse('Sub module created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Sub module not found', 404, 'NOT_FOUND');
  }
  if (data.parent_module_id) {
    await assertParentExists(data.parent_module_id);
  }
  const row = await repo.update(id, data);
  return itemResponse('Sub module updated', row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Sub module not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Sub module deleted', deleted.id);
};

module.exports = { list, create, update, remove };
