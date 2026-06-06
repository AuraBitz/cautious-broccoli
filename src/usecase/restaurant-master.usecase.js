const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema } = require('./common.schemas');

const repo = dataaccess.restaurantMaster;
const projectRepo = dataaccess.projectMaster;
const loginRepo = dataaccess.clientLoginMaster;
const clientRepo = dataaccess.clientManagement;

const restaurantStatusSchema = Joi.string()
  .valid('online', 'offline')
  .default('offline');

const createSchema = Joi.object({
  restaurant_name: Joi.string().trim().min(1).max(255).required(),
  restaurant_address: Joi.string().trim().allow(null, ''),
  city: Joi.string().trim().max(100).allow(null, ''),
  state: Joi.string().trim().max(100).allow(null, ''),
  country: Joi.string().trim().max(100).allow(null, ''),
  restaurant_mobile: Joi.string().trim().max(50).allow(null, ''),
  status: restaurantStatusSchema,
  project_id: Joi.number().integer().positive().allow(null),
  created_by: Joi.number().integer().positive().allow(null),
  owner_name: Joi.string().trim().min(1).max(255).allow(null, ''),
});

const updateSchema = Joi.object({
  restaurant_name: Joi.string().trim().min(1).max(255),
  restaurant_address: Joi.string().trim().allow(null, ''),
  city: Joi.string().trim().max(100).allow(null, ''),
  state: Joi.string().trim().max(100).allow(null, ''),
  country: Joi.string().trim().max(100).allow(null, ''),
  restaurant_mobile: Joi.string().trim().max(50).allow(null, ''),
  status: restaurantStatusSchema,
  project_id: Joi.number().integer().positive().allow(null),
}).min(1);

const assertProjectExists = async (projectId) => {
  if (projectId == null) return;
  const exists = await projectRepo.existsById(projectId);
  if (!exists) {
    throw new AppError('Project not found', 400, 'INVALID_PROJECT');
  }
};

const assertLoginExists = async (loginId) => {
  if (loginId == null) return;
  const exists = await loginRepo.existsById(loginId);
  if (!exists) {
    throw new AppError('created_by login not found', 400, 'INVALID_LOGIN_ID');
  }
};

const buildClientPayloadFromRestaurant = (restaurant, login, ownerName) => ({
  restaurant_id: restaurant.id,
  owner_name: ownerName || restaurant.restaurant_name,
  mobile: restaurant.restaurant_mobile ?? null,
  email: login?.email ?? null,
  address: restaurant.restaurant_address ?? null,
  city: restaurant.city ?? null,
  state: restaurant.state ?? null,
  country: restaurant.country ?? null,
  project_id: restaurant.project_id ?? null,
  login_id: login.id,
  plan_status: 'Active',
});

const syncClientManagementForRestaurant = async (
  restaurant,
  loginId,
  ownerName
) => {
  const login = await loginRepo.findById(loginId);
  if (!login) return;

  const existing = await clientRepo.findByLoginId(loginId);
  const clientPayload = buildClientPayloadFromRestaurant(
    restaurant,
    login,
    ownerName
  );

  if (existing) {
    await clientRepo.update(existing.id, clientPayload);
    return;
  }

  await clientRepo.create(clientPayload);
};

const publicListQuerySchema = Joi.object({
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(50),
  search: Joi.string().trim().allow('').optional(),
});

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant list fetched', result);
};

const publicList = async (listPayload = {}) => {
  const query = validateSchema(publicListQuerySchema, listPayload);
  const filters = { status: 'online' };
  if (query.search) {
    filters.restaurant_name = query.search;
  }
  const result = await repo.list({
    skip: query.skip,
    limit: query.limit,
    filters,
    sort: { field: 'restaurant_name', order: 'asc' },
    fieldTypes: query.search ? { restaurant_name: 'ilike' } : {},
  });
  return listResponse('Public restaurant list fetched', result);
};

const publicGetById = async (id) => {
  const row = await repo.findById(id);
  if (!row || row.status !== 'online') {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant fetched', row);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertProjectExists(data.project_id);
  await assertLoginExists(data.created_by ?? null);

  const ownerName =
    String(data.owner_name ?? '').trim() || data.restaurant_name;
  const { owner_name: _owner, ...restaurantData } = data;

  const row = await repo.create(restaurantData);
  const enriched = (await repo.findById(row.id)) ?? row;

  if (data.created_by) {
    await syncClientManagementForRestaurant(
      enriched,
      data.created_by,
      ownerName
    );
  }

  return itemResponse('Restaurant created', enriched, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }
  if (data.project_id !== undefined) {
    await assertProjectExists(data.project_id);
  }
  const row = await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant deleted', deleted.id);
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  publicList,
  publicGetById,
};
