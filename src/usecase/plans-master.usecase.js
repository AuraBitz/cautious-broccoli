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
const projectRepo = dataaccess.projectMaster;
const parentRepo = dataaccess.parentModulesMaster;

const createSchema = Joi.object({
  project_id: Joi.number().integer().positive().required(),
  plan_type: Joi.string().trim().min(1).required(),
  plan_valid_days: Joi.number().integer().min(0).default(0),
  plan_modules_id: intIdArray,
  amount: Joi.number().min(0).default(0),
  discount_amount: Joi.number().min(0).default(0),
  features: Joi.array().items(Joi.string().trim().max(500)).default([]),
  range_type: Joi.string().trim().valid('monthly', 'annually').default('monthly'),
  created_by: Joi.number().integer().positive().allow(null),
  updated_by: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  project_id: Joi.number().integer().positive().allow(null),
  plan_type: Joi.string().trim().min(1),
  plan_valid_days: Joi.number().integer().min(0),
  plan_modules_id: intIdArray,
  amount: Joi.number().min(0),
  discount_amount: Joi.number().min(0),
  features: Joi.array().items(Joi.string().trim().max(500)),
  range_type: Joi.string().trim().valid('monthly', 'annually'),
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

const assertProjectExists = async (projectId) => {
  if (projectId == null) return;
  const exists = await projectRepo.existsById(projectId);
  if (!exists) {
    throw new AppError('project_id not found', 400, 'INVALID_PROJECT');
  }
};

const pickPlanPayload = (data) => ({
  plan_type: data.plan_type,
  plan_valid_days: data.plan_valid_days,
  plan_modules_id: data.plan_modules_id,
  amount: data.amount,
  discount_amount: data.discount_amount,
  features: data.features,
  range_type: data.range_type,
  project_id: data.project_id,
  created_by: data.created_by,
  updated_by: data.updated_by,
});

const withProjectMeta = async (row) => {
  if (!row) return row;
  if (row.project_name != null && row.project_id != null) return row;
  if (row.project_id) {
    const project = await projectRepo.findById(row.project_id);
    return {
      ...row,
      project_name: project?.name ?? row.project_name ?? null,
    };
  }
  const project = await projectRepo.findProjectByPlanId(row.id);
  return {
    ...row,
    project_name: project?.name ?? null,
    project_id: project?.id ?? row.project_id ?? null,
  };
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }
  const project = await projectRepo.findProjectByPlanId(id);
  return itemResponse('Plan fetched', {
    ...row,
    project_id: project?.id ?? null,
  });
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Plan list fetched', result);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertProjectExists(data.project_id);
  await assertModulesExist(data.plan_modules_id);

  const row = await repo.create(pickPlanPayload(data));
  await projectRepo.removePlanFromAllProjects(row.id);
  await projectRepo.addPlanToProject(data.project_id, row.id);

  const enriched = await withProjectMeta(await repo.findById(row.id));
  return itemResponse('Plan created', enriched, 201);
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
  if (data.project_id !== undefined) {
    await assertProjectExists(data.project_id);
  }

  const currentProject = await projectRepo.findProjectByPlanId(id);
  const oldProjectId = currentProject?.id ?? null;

  const row = await repo.update(id, pickPlanPayload(data));

  if (data.project_id !== undefined) {
    await projectRepo.syncPlanProject(
      id,
      data.project_id,
      oldProjectId
    );
  }

  const enriched = await withProjectMeta(await repo.findById(id));
  return itemResponse('Plan updated', enriched);
};

const remove = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }
  await projectRepo.removePlanFromAllProjects(id);
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Plan not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Plan deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
