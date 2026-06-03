const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, intIdArray } = require('./common.schemas');

const repo = dataaccess.plansMaster;
const parentRepo = dataaccess.parentModulesMaster;

const createSchema = Joi.object({
  plan_type: Joi.string().trim().min(1).required(),
  plan_valid_days: Joi.number().integer().min(0).default(0),
  plan_modules_id: intIdArray,
  amount: Joi.number().min(0).default(0),
  discount_amount: Joi.number().min(0).default(0),
  created_by: Joi.number().integer().positive().allow(null),
  updated_by: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  plan_type: Joi.string().trim().min(1),
  plan_valid_days: Joi.number().integer().min(0),
  plan_modules_id: intIdArray,
  amount: Joi.number().min(0),
  discount_amount: Joi.number().min(0),
  updated_by: Joi.number().integer().positive().allow(null),
}).min(1);

const assertModulesExist = async (moduleIds) => {
  if (!moduleIds.length) return;
  const allExist = await parentRepo.existsAllByIds(moduleIds);
  if (!allExist) {
    throw new AppError(
      'One or more plan_modules_id not found',
      400,
      'INVALID_MODULE'
    );
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Plan list fetched', result);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertModulesExist(data.plan_modules_id);
  const row = await repo.create(data);
  return itemResponse('Plan created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }
  if (data.plan_modules_id) {
    await assertModulesExist(data.plan_modules_id);
  }
  const row = await repo.update(id, data);
  return itemResponse('Plan updated', row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Plan deleted', deleted.id);
};

module.exports = { list, create, update, remove };
