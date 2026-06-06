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

const repo = dataaccess.restaurantMenuMaster;
const restaurantRepo = dataaccess.restaurantMaster;

const menuItemSchema = Joi.object({
  id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  name: Joi.string().trim().min(1).required(),
  amount: Joi.number().min(0).required(),
  image: Joi.string().trim().allow(null, ''),
});

const menuCategorySchema = Joi.object({
  id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  title: Joi.string().trim().min(1).required(),
  items: Joi.array().items(menuItemSchema).default([]),
});

const normalizeMenuItems = (items = []) =>
  items.map((cat, ci) => ({
    id: cat.id ?? ci + 1,
    title: String(cat.title ?? '').trim(),
    items: (cat.items ?? []).map((item, ii) => ({
      id: item.id ?? ii + 1,
      name: String(item.name ?? '').trim(),
      amount: Number(item.amount) || 0,
      image: item.image ? String(item.image).trim() : null,
    })),
  }));

const createSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  restaurant_thali_name: Joi.string().trim().min(1).max(255).required(),
  thali_image: Joi.string().trim().allow(null, ''),
  menu_items: Joi.array().items(menuCategorySchema).default([]),
});

const updateSchema = Joi.object({
  restaurant_thali_name: Joi.string().trim().min(1).max(255),
  thali_image: Joi.string().trim().allow(null, ''),
  menu_items: Joi.array().items(menuCategorySchema),
}).min(1);

const assertRestaurantExists = async (restaurantId) => {
  const exists = await restaurantRepo.existsById(restaurantId);
  if (!exists) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant menu list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant menu not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant menu fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertRestaurantExists(data.restaurant_id);
  const row = await repo.create({
    ...data,
    menu_items: normalizeMenuItems(data.menu_items),
  });
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant menu created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant menu not found', 404, 'NOT_FOUND');
  }
  const patch = { ...data };
  if (data.menu_items !== undefined) {
    patch.menu_items = normalizeMenuItems(data.menu_items);
  }
  await repo.update(id, patch);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant menu updated', enriched ?? patch);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant menu not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant menu deleted', deleted.id);
};

const listByRestaurant = async (restaurantId) => {
  await assertRestaurantExists(restaurantId);
  const result = await repo.list({
    skip: 0,
    limit: 1000,
    sort: { field: 'created_at', order: 'desc' },
    filters: {
      restaurant_id: { op: 'equals', value: restaurantId },
    },
  });
  return listResponse('Restaurant menu list fetched', result);
};

module.exports = { list, getById, create, update, remove, listByRestaurant };
