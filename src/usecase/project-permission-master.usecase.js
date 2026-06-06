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

const repo = dataaccess.projectPermissionMaster;
const projectRoleRepo = dataaccess.projectRoleMaster;
const projectRepo = dataaccess.projectMaster;
const loginRepo = dataaccess.clientLoginMaster;
const clientRepo = dataaccess.clientManagement;

const createSchema = Joi.object({
  role_ids: intIdArray.min(1).required(),
  project_ids: intIdArray.default([]),
  overall_access: Joi.boolean().default(false),
});

const updateSchema = Joi.object({
  role_ids: intIdArray.min(1),
  project_ids: intIdArray,
  overall_access: Joi.boolean(),
}).min(1);

const assertRolesExist = async (roleIds) => {
  const allExist = await projectRoleRepo.existsAllByIds(roleIds);
  if (!allExist) {
    throw new AppError('One or more role_ids not found', 400, 'INVALID_ROLE');
  }
};

const assertProjectsExist = async (projectIds) => {
  if (!projectIds.length) return;
  const allExist = await projectRepo.existsAllByIds(projectIds);
  if (!allExist) {
    throw new AppError('One or more project_ids not found', 400, 'INVALID_PROJECT');
  }
};

const assertNoRoleOverlap = async (roleIds, excludeId = null) => {
  const overlaps = await repo.findRowsOverlappingRoleIds(roleIds, excludeId);
  if (overlaps.length) {
    throw new AppError(
      'One or more roles already assigned in another permission row',
      409,
      'DUPLICATE_ROLE'
    );
  }
};

const normalizePayload = (data) => ({
  ...data,
  role_ids: [...new Set((data.role_ids ?? []).map(Number).filter(Number.isFinite))],
  project_ids: data.overall_access ? [] : (data.project_ids ?? []),
});

const mergePermissions = (permissions = []) => {
  if (!permissions.length) {
    return {
      accessType: 'project',
      projectRoleId: null,
      overallAccess: false,
      projectIds: [],
    };
  }

  if (permissions.some((row) => row.overall_access)) {
    return {
      accessType: 'management',
      projectRoleId: null,
      overallAccess: true,
      projectIds: [],
    };
  }

  const projectIds = [
    ...new Set(
      permissions
        .flatMap((row) => row.project_ids ?? [])
        .map(Number)
        .filter(Number.isFinite)
    ),
  ];

  return {
    accessType: 'project',
    projectRoleId: null,
    overallAccess: false,
    projectIds,
  };
};

const enrichWithRoleMeta = async (access) => {
  const roleId = access.projectRoleId ? Number(access.projectRoleId) : null;
  if (!roleId || !Number.isFinite(roleId)) {
    return { ...access, projectRoleName: null };
  }

  const role = await projectRoleRepo.findById(roleId);
  return {
    ...access,
    projectRoleName: role?.role_name ?? null,
  };
};

const resolveAccessForProjectRole = async (projectRoleId) => {
  const roleId = Number(projectRoleId);
  if (!Number.isFinite(roleId) || roleId <= 0) {
    return enrichWithRoleMeta({
      accessType: 'project',
      projectRoleId: null,
      overallAccess: false,
      projectIds: [],
    });
  }

  const permissions = await repo.findAllByRoleId(roleId);
  const merged = mergePermissions(permissions);
  return enrichWithRoleMeta({
    ...merged,
    projectRoleId: roleId,
  });
};

const resolveAccessForClientLogin = async (loginId) => {
  const row = await clientRepo.findByLoginId(loginId);
  if (!row) return null;

  const enriched = (await clientRepo.findById(row.id)) ?? row;
  const projectId =
    enriched.project_id != null ? Number(enriched.project_id) : null;
  if (!projectId || !Number.isFinite(projectId)) return null;

  return {
    accessType: 'project',
    accessKind: 'client',
    projectRoleId: null,
    projectRoleName: null,
    roleMasterId: null,
    roleMasterName: null,
    overallAccess: false,
    projectIds: [projectId],
    planId:
      enriched.plan_id != null && Number.isFinite(Number(enriched.plan_id))
        ? Number(enriched.plan_id)
        : null,
    restaurantName: enriched.restaurant_name?.trim() || null,
    ownerName: enriched.owner_name?.trim() || null,
    restaurantId:
      enriched.restaurant_id != null &&
      Number.isFinite(Number(enriched.restaurant_id))
        ? Number(enriched.restaurant_id)
        : null,
  };
};

const resolveAccessForLogin = async (loginId, loginRole) => {
  if (loginRole && loginRole !== 'client') {
    return {
      accessType: 'management',
      projectRoleId: null,
      overallAccess: true,
      projectIds: [],
    };
  }

  const clientAccess = await resolveAccessForClientLogin(loginId);
  if (clientAccess) {
    return clientAccess;
  }

  const account = await loginRepo.findById(loginId);
  const projectRoleId = account?.project_role_id
    ? Number(account.project_role_id)
    : null;

  if (!projectRoleId || !Number.isFinite(projectRoleId)) {
    return {
      accessType: 'project',
      projectRoleId: null,
      overallAccess: false,
      projectIds: [],
    };
  }

  const permissions = await repo.findAllByRoleId(projectRoleId);
  const merged = mergePermissions(permissions);

  return enrichWithRoleMeta({
    ...merged,
    projectRoleId,
  });
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Project permission list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Project permission not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Project permission fetched', row);
};

const create = async (payload) => {
  const data = normalizePayload(validateSchema(createSchema, payload));
  await assertRolesExist(data.role_ids);
  await assertProjectsExist(data.project_ids);
  await assertNoRoleOverlap(data.role_ids);

  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Project permission created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Project permission not found', 404, 'NOT_FOUND');
  }

  const merged = normalizePayload({
    role_ids:
      data.role_ids !== undefined ? data.role_ids : (existing.role_ids ?? []),
    project_ids:
      data.project_ids !== undefined
        ? data.project_ids
        : (existing.project_ids ?? []),
    overall_access:
      data.overall_access !== undefined
        ? data.overall_access
        : existing.overall_access,
  });

  await assertRolesExist(merged.role_ids);
  await assertProjectsExist(merged.project_ids);
  await assertNoRoleOverlap(merged.role_ids, id);
  await repo.update(id, merged);
  const enriched = await repo.findById(id);
  return itemResponse('Project permission updated', enriched ?? merged);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Project permission not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Project permission deleted', deleted.id);
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  resolveAccessForLogin,
  resolveAccessForProjectRole,
};
