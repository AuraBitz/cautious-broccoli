const Joi = require('joi');
const bcrypt = require('bcryptjs');
const dataaccess = require('../dataaccess');
const { AppError, jwtToken } = require('../utils');
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
const planBusiness = require('./client-plan.business');
const projectPermissionUsecase = require('./project-permission-master.usecase');

const SALT_ROUNDS = 10;
const loginRepo = dataaccess.clientLoginMaster;

const projectRoleRepo = dataaccess.projectRoleMaster;

const createSchema = Joi.object({
  username: Joi.string().trim().min(3).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().trim().default('client'),
  project_role_id: Joi.number().integer().positive().allow(null),
  device_id: Joi.string().trim().allow(null, ''),
  status: optionalMasterStatusSchema.default('active'),
});

const updateSchema = Joi.object({
  username: Joi.string().trim().min(3),
  email: Joi.string().trim().email(),
  password: Joi.string().min(6),
  role: Joi.string().trim(),
  project_role_id: Joi.number().integer().positive().allow(null),
  device_id: Joi.string().trim().allow(null, ''),
  status: optionalMasterStatusSchema,
}).min(1);

const assertProjectRoleExists = async (projectRoleId) => {
  if (projectRoleId == null) return;
  const role = await projectRoleRepo.findById(projectRoleId);
  if (!role) {
    throw new AppError('Project role not found', 400, 'INVALID_PROJECT_ROLE');
  }
};

const loginSchema = Joi.object({
  username: Joi.string().trim(),
  email: Joi.string().trim().email(),
  password: Joi.string().required(),
  device_id: Joi.string().trim().allow(null, ''),
}).or('username', 'email');

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const getById = async (id) => {
  const row = await loginRepo.findById(id);
  if (!row) {
    throw new AppError('Login account not found', 404, 'NOT_FOUND');
  }
  const { password, ...safe } = row;
  return itemResponse('Login account fetched', safe);
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await loginRepo.list(query);
  return listResponse('Login accounts fetched', result);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertProjectRoleExists(data.project_role_id ?? null);
  const duplicate = await loginRepo.existsDuplicate({
    username: data.username,
    email: data.email,
  });
  if (duplicate) {
    throw new AppError('Username or email already exists', 409, 'DUPLICATE');
  }

  const row = await loginRepo.create({
    ...data,
    password: await hashPassword(data.password),
  });
  return itemResponse('Login account created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  if (data.project_role_id !== undefined) {
    await assertProjectRoleExists(data.project_role_id ?? null);
  }
  const existing = await loginRepo.findById(id);
  if (!existing) {
    throw new AppError('Login account not found', 404, 'NOT_FOUND');
  }

  if (data.username || data.email) {
    const duplicate = await loginRepo.existsDuplicate({
      username: data.username || existing.username,
      email: data.email || existing.email,
      excludeId: id,
    });
    if (duplicate) {
      throw new AppError('Username or email already exists', 409, 'DUPLICATE');
    }
  }

  const updatePayload = { ...data };
  if (data.password) {
    updatePayload.password = await hashPassword(data.password);
  }

  const row = await loginRepo.update(id, updatePayload);
  return itemResponse('Login account updated', row);
};

const remove = async (id) => {
  const deleted = await loginRepo.remove(id);
  if (!deleted) {
    throw new AppError('Login account not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Login account deleted', deleted.id);
};

const syncLoginPlanBeforeAuth = async (loginId) => {
  const client = await dataaccess.clientManagement.findByLoginId(loginId);
  if (client) {
    await planBusiness.syncClientPlan(client);
  }
};

const login = async (payload) => {
  const data = validateSchema(loginSchema, payload);
  const identifier = data.username || data.email;

  const account = await loginRepo.findByUsernameOrEmail(identifier);
  if (!account) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  await syncLoginPlanBeforeAuth(account.id);

  const freshAccount = await loginRepo.findById(account.id);
  if (freshAccount.status !== 'active') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
  }

  const valid = await comparePassword(data.password, account.password);
  if (!valid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (data.device_id) {
    await loginRepo.update(freshAccount.id, { device_id: data.device_id });
  }

  const user = await loginRepo.findById(freshAccount.id);
  const accessToken = jwtToken.signAccessToken(
    jwtToken.buildTokenPayload(user)
  );
  const projectAccess = await projectPermissionUsecase.resolveAccessForLogin(
    freshAccount.id,
    freshAccount.role ?? null
  );

  return itemResponse('Login successful', {
    user,
    token: accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    projectAccess,
  });
};

const logout = async () => itemResponse('Logged out successfully', null);

const me = async (userId) => {
  await syncLoginPlanBeforeAuth(userId);

  const account = await loginRepo.findById(userId);
  if (!account) {
    throw new AppError('Login account not found', 404, 'NOT_FOUND');
  }
  if (account.status !== 'active') {
    throw new AppError('Account is not active', 403, 'ACCOUNT_INACTIVE');
  }
  const projectAccess = await projectPermissionUsecase.resolveAccessForLogin(
    userId,
    account.role ?? null
  );

  return itemResponse('Profile fetched', {
    ...account,
    projectAccess,
  });
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  login,
  logout,
  me,
};
