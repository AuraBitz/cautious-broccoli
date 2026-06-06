const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, optionalMasterStatusSchema, intIdArray } =
  require('./common.schemas');

const repo = dataaccess.rolesMaster;
const projectRepo = dataaccess.projectMaster;

const createSchema = Joi.object({
  role_code: Joi.string().trim().min(1).max(50).required(),
  role_name: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().allow(null, ''),
  project_ids: intIdArray,
  status: optionalMasterStatusSchema.default('active'),
  created_by: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  role_code: Joi.string().trim().min(1).max(50),
  role_name: Joi.string().trim().min(1),
  description: Joi.string().trim().allow(null, ''),
  project_ids: intIdArray,
  status: optionalMasterStatusSchema,
}).min(1);

const assertProjectsExist = async (projectIds) => {
  if (!projectIds.length) return;
  const allExist = await projectRepo.existsAllByIds(projectIds);
  if (!allExist) {
    throw new AppError(
      'One or more project_ids not found',
      400,
      'INVALID_PROJECT'
    );
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Role list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Role fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertProjectsExist(data.project_ids);
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Role created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }
  if (data.project_ids) {
    await assertProjectsExist(data.project_ids);
  }
  const row = await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Role updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Role not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Role deleted', deleted.id);
};

const listByProject = async (projectId) => {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new AppError('Invalid project id', 400, 'INVALID_PROJECT');
  }
  const rows = await repo.listByProjectId(pid);
  return itemResponse('Roles for project fetched', { rows, total: rows.length });
};

const resolveEmployeeProjectAccess = async (roleId) => {
  const id = Number(roleId);
  if (!Number.isFinite(id) || id <= 0) {
    return {
      accessType: 'project',
      projectRoleId: null,
      projectRoleName: null,
      overallAccess: false,
      projectIds: [],
    };
  }

  const role = await repo.findById(id);
  if (!role) {
    return {
      accessType: 'project',
      projectRoleId: id,
      projectRoleName: null,
      overallAccess: false,
      projectIds: [],
    };
  }

  const projectIds = [
    ...new Set(
      (role.project_ids ?? []).map(Number).filter((n) => Number.isFinite(n) && n > 0)
    ),
  ];

  return {
    accessType: 'project',
    projectRoleId: id,
    projectRoleName: role.role_name ?? null,
    overallAccess: false,
    projectIds,
  };
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listByProject,
  resolveEmployeeProjectAccess,
};
