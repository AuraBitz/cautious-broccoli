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
const { listQuerySchema } = require('./common.schemas');
const projectPermissionUsecase = require('./project-permission-master.usecase');

const SALT_ROUNDS = 10;
const loginRepo = dataaccess.employeeLoginMaster;
const employeeRepo = dataaccess.employeeMaster;

const createSchema = Joi.object({
  password: Joi.string().min(6).required(),
});

const updateSchema = Joi.object({
  password: Joi.string().min(6),
}).min(1);

const loginSchema = Joi.object({
  username: Joi.string().trim(),
  email: Joi.string().trim().email(),
  password: Joi.string().required(),
}).or('username', 'email');

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await loginRepo.list(query);
  return listResponse('Employee login accounts fetched', result);
};

const getById = async (id) => {
  const row = await loginRepo.findById(id);
  if (!row) {
    throw new AppError('Employee login not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Employee login fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  const row = await loginRepo.create({
    password: await hashPassword(data.password),
  });
  return itemResponse('Employee login created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await loginRepo.findById(id);
  if (!existing) {
    throw new AppError('Employee login not found', 404, 'NOT_FOUND');
  }

  const updatePayload = { ...data };
  if (data.password) {
    updatePayload.password = await hashPassword(data.password);
  }

  const row = await loginRepo.update(id, updatePayload);
  return itemResponse('Employee login updated', row);
};

const remove = async (id) => {
  const deleted = await loginRepo.remove(id);
  if (!deleted) {
    throw new AppError('Employee login not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Employee login deleted', deleted.id);
};

const login = async (payload) => {
  const data = validateSchema(loginSchema, payload);
  const identifier = (data.username || data.email || '').trim();

  const employee = await employeeRepo.findByEmpCodeOrEmail(identifier);
  if (!employee || !employee.emp_login_id) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const account = await loginRepo.findByIdWithPassword(employee.emp_login_id);
  if (!account) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  const valid = await comparePassword(data.password, account.password);
  if (!valid) {
    throw new AppError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
  }

  if (String(employee.status).toLowerCase() !== 'active') {
    throw new AppError('Employee account is not active', 403, 'ACCOUNT_INACTIVE');
  }

  const sessionUser = {
    id: account.id,
    username: employee.emp_code,
    email: employee.email || '',
    employee_name: employee.employee_name || employee.emp_code,
    role: 'employee',
  };

  const accessToken = jwtToken.signAccessToken({
    ...jwtToken.buildTokenPayload(sessionUser),
    accountType: 'employee',
  });

  const projectAccess =
    await projectPermissionUsecase.resolveAccessForProjectRole(employee.emp_role);

  return itemResponse('Login successful', {
    user: sessionUser,
    token: accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    projectAccess: {
      ...projectAccess,
      roleMasterId: employee.role_master_id ?? null,
      roleMasterName: employee.project_role_name ?? null,
    },
  });
};

const logout = async () => itemResponse('Logged out successfully', null);

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  login,
  logout,
};
