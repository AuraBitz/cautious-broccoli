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
  intIdArray,
} = require('./common.schemas');

const repo = dataaccess.projectMaster;
const plansRepo = dataaccess.plansMaster;

const createSchema = Joi.object({
  name: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().allow(null, ''),
  plan_ids: intIdArray,
  project_start_at: Joi.date().iso().allow(null),
  status: optionalMasterStatusSchema.default('active'),
  module_ids: intIdArray,
});

const updateSchema = Joi.object({
  name: Joi.string().trim().min(1),
  description: Joi.string().trim().allow(null, ''),
  plan_ids: intIdArray,
  project_start_at: Joi.date().iso().allow(null),
  status: optionalMasterStatusSchema,
  module_ids: intIdArray,
}).min(1);

const assertPlansExist = async (planIds) => {
  if (!planIds.length) return;
  const allExist = await plansRepo.existsAllByIds(planIds);
  if (!allExist) {
    throw new AppError('One or more plan_ids not found', 400, 'INVALID_PLAN');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Project list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Project fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertPlansExist(data.plan_ids);
  const row = await repo.create(data);
  return itemResponse('Project created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }
  if (data.plan_ids) {
    await assertPlansExist(data.plan_ids);
  }
  const row = await repo.update(id, data);
  return itemResponse('Project updated', row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Project deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
