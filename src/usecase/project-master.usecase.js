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

const { filterPortalModulesByPermission } = require('../utils/filter-portal-modules');

const repo = dataaccess.projectMaster;
const plansRepo = dataaccess.plansMaster;
const parentModulesRepo = dataaccess.parentModulesMaster;
const childModulesRepo = dataaccess.childModuleMaster;
const permissionsRepo = dataaccess.permissionsMaster;

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

const getPortalModules = async (id, roleMasterId = null, planId = null) => {
  const project = await repo.findById(id);
  if (!project) {
    throw new AppError('Project not found', 404, 'NOT_FOUND');
  }

  let moduleIds = (project.module_ids ?? [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0);

  if (planId != null && Number.isFinite(Number(planId))) {
    const parsedPlanId = Number(planId);
    if (parsedPlanId <= 0) {
      moduleIds = [];
    } else {
      const plan = await plansRepo.findById(parsedPlanId);
      const planModuleSet = new Set(
        (plan?.plan_modules_id ?? [])
          .map(Number)
          .filter((n) => Number.isFinite(n) && n > 0)
      );
      moduleIds = moduleIds.filter((mid) => planModuleSet.has(mid));
    }
  }

  const parents = await parentModulesRepo.listByIds(moduleIds);
  const children = await childModulesRepo.listByParentModuleIds(moduleIds);

  let modules = parents.map((parent) => ({
    id: parent.id,
    name: parent.module_name,
    status: parent.status,
    children: children
      .filter((child) => child.parent_module_id === parent.id)
      .map((child) => ({
        id: child.id,
        name: child.child_module_name,
        parentId: parent.id,
      })),
  }));

  const roleId = Number(roleMasterId);
  if (Number.isFinite(roleId) && roleId > 0) {
    const permission = await permissionsRepo.findByRoleId(roleId);
    modules = filterPortalModulesByPermission(
      modules,
      permission?.modules ?? {}
    );
  }

  const visibleModuleIds = modules.map((mod) => mod.id);

  return itemResponse('Project portal modules fetched', {
    projectId: project.id,
    projectName: project.name,
    moduleIds: visibleModuleIds,
    planIds: project.plan_ids ?? [],
    status: project.status,
    description: project.description,
    modules,
    roleMasterId: Number.isFinite(roleId) && roleId > 0 ? roleId : null,
  });
};

module.exports = { list, getById, create, update, remove, getPortalModules };
