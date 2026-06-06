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

const repo = dataaccess.childModuleMaster;
const parentRepo = dataaccess.parentModulesMaster;

const createSchema = Joi.object({
  parent_module_id: Joi.number().integer().positive().required(),
  child_module_name: Joi.string().trim().min(1).required(),
  created_by: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  parent_module_id: Joi.number().integer().positive(),
  child_module_name: Joi.string().trim().min(1),
}).min(1);

const assertParentExists = async (parentModuleId) => {
  const row = await parentRepo.findById(parentModuleId);
  if (!row) {
    throw new AppError('Parent module not found', 400, 'INVALID_PARENT_MODULE');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Child module list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Child module not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Child module fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertParentExists(data.parent_module_id);
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Child module created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Child module not found', 404, 'NOT_FOUND');
  }
  if (data.parent_module_id) {
    await assertParentExists(data.parent_module_id);
  }
  const row = await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Child module updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Child module not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Child module deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
