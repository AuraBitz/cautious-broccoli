const Joi = require('joi');
const bcrypt = require('bcryptjs');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, optionalMasterStatusSchema } = require('./common.schemas');

const SALT_ROUNDS = 10;
const repo = dataaccess.employeeMaster;
const loginRepo = dataaccess.employeeLoginMaster;
const projectRoleRepo = dataaccess.projectRoleMaster;
const rolesMasterRepo = dataaccess.rolesMaster;

const createSchema = Joi.object({
  emp_code: Joi.string().trim().min(1).max(100).required(),
  employee_name: Joi.string().trim().min(1).required(),
  mobile: Joi.string().trim().allow(null, ''),
  email: Joi.string().trim().email().allow(null, ''),
  address: Joi.string().trim().allow(null, ''),
  emp_role: Joi.number().integer().positive().optional(),
  role_master_id: Joi.number().integer().positive().allow(null),
  status: optionalMasterStatusSchema.default('active'),
  emp_login_id: Joi.number().integer().positive().allow(null),
  password: Joi.string().min(6).required(),
  scope_project_id: Joi.number().integer().positive().optional(),
});

const updateSchema = Joi.object({
  emp_code: Joi.string().trim().min(1).max(100),
  employee_name: Joi.string().trim().min(1),
  mobile: Joi.string().trim().allow(null, ''),
  email: Joi.string().trim().email().allow(null, ''),
  address: Joi.string().trim().allow(null, ''),
  emp_role: Joi.number().integer().positive(),
  role_master_id: Joi.number().integer().positive().allow(null),
  status: optionalMasterStatusSchema,
  emp_login_id: Joi.number().integer().positive().allow(null),
  password: Joi.string().min(6),
  scope_project_id: Joi.number().integer().positive().optional(),
}).min(1);

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);

const assertProjectRoleExists = async (roleId) => {
  const role = await projectRoleRepo.findById(roleId);
  if (!role) {
    throw new AppError('Project role not found', 400, 'INVALID_EMP_ROLE');
  }
};

const assertProjectRoleForProject = async (roleId, projectId) => {
  const allowed = await projectRoleRepo.isRoleAllowedForProject(roleId, projectId);
  if (!allowed) {
    throw new AppError(
      'Selected project role is not assigned to this project in Project Permission Master',
      400,
      'INVALID_EMP_ROLE_FOR_PROJECT'
    );
  }
};

const assertRoleMasterExists = async (roleId) => {
  if (roleId == null) return;
  const role = await rolesMasterRepo.findById(roleId);
  if (!role) {
    throw new AppError('Role Master entry not found', 400, 'INVALID_ROLE_MASTER');
  }
};

const assertRoleMasterForProject = async (roleId, projectId) => {
  if (roleId == null) return;
  const allowed = await rolesMasterRepo.isRoleAllowedForProject(roleId, projectId);
  if (!allowed) {
    throw new AppError(
      'Selected role is not linked to this project in Role Master',
      400,
      'INVALID_ROLE_MASTER_FOR_PROJECT'
    );
  }
};

const resolveEmpRoleForPortalProject = async (projectId) => {
  const roles = await projectRoleRepo.listByProjectId(projectId);
  if (!roles.length) {
    throw new AppError(
      'No project role configured for this project in Project Permission Master',
      400,
      'NO_PROJECT_ROLE_FOR_PROJECT'
    );
  }
  return roles[0].id;
};

const assertLoginAvailable = async (loginId, excludeEmployeeId = null) => {
  if (loginId == null) return;
  const exists = await loginRepo.existsById(loginId);
  if (!exists) {
    throw new AppError('emp_login_id not found', 400, 'INVALID_LOGIN_ID');
  }
  const linked = await repo.findByLoginId(loginId);
  if (linked && linked.id !== excludeEmployeeId) {
    throw new AppError('Login already linked to another employee', 409, 'LOGIN_IN_USE');
  }
};

const resolveLoginOnCreate = async (data) => {
  if (data.emp_login_id) {
    await assertLoginAvailable(data.emp_login_id);
    if (data.password) {
      await loginRepo.update(data.emp_login_id, {
        password: await hashPassword(data.password),
      });
    }
    return data.emp_login_id;
  }

  const login = await loginRepo.create({
    password: await hashPassword(data.password),
  });
  return login.id;
};

const syncLoginOnUpdate = async (existing, data) => {
  let loginId =
    data.emp_login_id !== undefined ? data.emp_login_id : existing.emp_login_id;

  if (data.emp_login_id !== undefined) {
    await assertLoginAvailable(data.emp_login_id, existing.id);
  }

  if (data.password) {
    if (!loginId) {
      const login = await loginRepo.create({
        password: await hashPassword(data.password),
      });
      loginId = login.id;
    } else {
      await loginRepo.update(loginId, {
        password: await hashPassword(data.password),
      });
    }
  }

  return loginId;
};

const list = async (listPayload) => {
  const scopeProjectId = listPayload?.scope_project_id ?? null;
  const { scope_project_id: _scope, ...rest } = listPayload ?? {};
  const query = validateSchema(listQuerySchema, rest);
  const result = await repo.list(query, scopeProjectId);
  return listResponse('Employees fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Employee fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);

  if (data.scope_project_id) {
    if (!data.role_master_id) {
      throw new AppError(
        'Project Role (Role Master) is required',
        400,
        'INVALID_ROLE_MASTER'
      );
    }
    await assertRoleMasterForProject(data.role_master_id, data.scope_project_id);
    if (!data.emp_role) {
      data.emp_role = await resolveEmpRoleForPortalProject(data.scope_project_id);
    } else {
      await assertProjectRoleForProject(data.emp_role, data.scope_project_id);
    }
  }

  if (!data.emp_role) {
    throw new AppError('Project role (emp_role) is required', 400, 'INVALID_EMP_ROLE');
  }

  await assertProjectRoleExists(data.emp_role);
  await assertRoleMasterExists(data.role_master_id);

  const duplicateCode = await repo.existsByEmpCode(data.emp_code);
  if (duplicateCode) {
    throw new AppError('Employee code already exists', 409, 'DUPLICATE_CODE');
  }

  const empLoginId = await resolveLoginOnCreate(data);

  const row = await repo.create({
    emp_code: data.emp_code,
    employee_name: data.employee_name,
    mobile: data.mobile || null,
    email: data.email || null,
    address: data.address || null,
    emp_role: data.emp_role,
    role_master_id: data.role_master_id ?? null,
    status: data.status,
    emp_login_id: empLoginId,
  });

  const enriched = await repo.findById(row.id);
  return itemResponse('Employee created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND');
  }

  if (data.emp_code) {
    const duplicateCode = await repo.existsByEmpCode(data.emp_code, id);
    if (duplicateCode) {
      throw new AppError('Employee code already exists', 409, 'DUPLICATE_CODE');
    }
  }

  if (data.scope_project_id) {
    const projectId = Number(data.scope_project_id);
    const inProject = await repo.belongsToProject(id, projectId);
    if (!inProject) {
      throw new AppError(
        'Employee does not belong to this project',
        403,
        'EMPLOYEE_PROJECT_MISMATCH'
      );
    }
    if (data.role_master_id !== undefined) {
      await assertRoleMasterForProject(data.role_master_id, projectId);
    }
    if (data.emp_role) {
      await assertProjectRoleForProject(data.emp_role, projectId);
    }
  } else {
    if (data.emp_role) {
      await assertProjectRoleExists(data.emp_role);
    }
    if (data.role_master_id !== undefined) {
      await assertRoleMasterExists(data.role_master_id);
    }
  }

  const loginId = await syncLoginOnUpdate(existing, data);

  const updatePayload = {
    emp_code: data.emp_code,
    employee_name: data.employee_name,
    mobile: data.mobile,
    email: data.email,
    address: data.address,
    status: data.status,
    emp_login_id: data.emp_login_id !== undefined ? data.emp_login_id : loginId,
  };

  if (data.scope_project_id) {
    if (data.role_master_id !== undefined) {
      updatePayload.role_master_id = data.role_master_id;
    }
    if (data.emp_role !== undefined) {
      updatePayload.emp_role = data.emp_role;
    }
  } else {
    if (data.emp_role !== undefined) updatePayload.emp_role = data.emp_role;
    if (data.role_master_id !== undefined) {
      updatePayload.role_master_id = data.role_master_id;
    }
  }

  const row = await repo.update(id, updatePayload);

  const enriched = await repo.findById(id);
  return itemResponse('Employee updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Employee not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Employee deleted', deleted.id);
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
};
