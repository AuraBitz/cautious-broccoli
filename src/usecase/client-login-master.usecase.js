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

const SALT_ROUNDS = 10;
const loginRepo = dataaccess.clientLoginMaster;

const createSchema = Joi.object({
  username: Joi.string().trim().min(3).required(),
  email: Joi.string().trim().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().trim().default('client'),
  device_id: Joi.string().trim().allow(null, ''),
  status: optionalMasterStatusSchema.default('active'),
});

const updateSchema = Joi.object({
  username: Joi.string().trim().min(3),
  email: Joi.string().trim().email(),
  password: Joi.string().min(6),
  role: Joi.string().trim(),
  device_id: Joi.string().trim().allow(null, ''),
  status: optionalMasterStatusSchema,
}).min(1);

const loginSchema = Joi.object({
  username: Joi.string().trim(),
  email: Joi.string().trim().email(),
  password: Joi.string().required(),
  device_id: Joi.string().trim().allow(null, ''),
}).or('username', 'email');

const hashPassword = (password) => bcrypt.hash(password, SALT_ROUNDS);
const comparePassword = (plain, hash) => bcrypt.compare(plain, hash);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await loginRepo.list(query);
  return listResponse('Login accounts fetched', result);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
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

  return itemResponse('Login successful', {
    user,
    token: accessToken,
    tokenType: 'Bearer',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
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
  return itemResponse('Profile fetched', account);
};

module.exports = { list, create, update, remove, login, logout, me };
