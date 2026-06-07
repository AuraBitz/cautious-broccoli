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

const repo = dataaccess.restaurantCallWaiter;
const restaurantRepo = dataaccess.restaurantMaster;
const floorRepo = dataaccess.restaurantFloorMaster;
const tableRepo = dataaccess.restaurantTableMaster;

const createSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  floor_id: Joi.number().integer().positive().required(),
  table_id: Joi.number().integer().positive().required(),
  is_ring: Joi.boolean().default(true),
  calling_text: Joi.alternatives()
    .try(Joi.string().trim().max(2000).allow(null, ''), Joi.object())
    .optional(),
});

const updateSchema = Joi.object({
  is_ring: Joi.boolean(),
  ring_count: Joi.number().integer().min(0),
  calling_text: Joi.object().optional(),
  floor_id: Joi.number().integer().positive(),
}).min(1);

const assertCallTargets = async (data) => {
  const restaurant = await restaurantRepo.findById(data.restaurant_id);
  if (!restaurant) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }

  const floor = await floorRepo.findById(data.floor_id);
  if (!floor || Number(floor.restaurant_id) !== Number(data.restaurant_id)) {
    throw new AppError('Floor not found for restaurant', 400, 'INVALID_FLOOR');
  }

  const table = await tableRepo.findById(data.table_id);
  if (!table || Number(table.restaurant_id) !== Number(data.restaurant_id)) {
    throw new AppError('Table not found for restaurant', 400, 'INVALID_TABLE');
  }
  if (Number(table.floor_id) !== Number(data.floor_id)) {
    throw new AppError('Table does not belong to floor', 400, 'INVALID_TABLE_FLOOR');
  }
};

const extractMessageText = (callingText) => {
  if (callingText == null) return '';
  if (typeof callingText === 'string') return callingText.trim();
  if (typeof callingText === 'object') {
    const firstKey = Object.keys(callingText).sort((a, b) => Number(a) - Number(b))[0];
    if (firstKey && callingText[firstKey]) {
      return String(callingText[firstKey]).trim();
    }
  }
  return '';
};

const normalizeCreatePayload = (payload) => {
  const data = validateSchema(createSchema, payload);

  if (data.is_ring) {
    return {
      restaurant_id: data.restaurant_id,
      floor_id: data.floor_id,
      table_id: data.table_id,
      is_ring: true,
      message_text: null,
    };
  }

  const text = extractMessageText(data.calling_text);
  if (!text) {
    throw new AppError('calling_text is required when is_ring is false', 400, 'VALIDATION_ERROR');
  }

  return {
    restaurant_id: data.restaurant_id,
    floor_id: data.floor_id,
    table_id: data.table_id,
    is_ring: false,
    message_text: text,
  };
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant call waiter list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant call waiter not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant call waiter fetched', row);
};

const listRecentByRestaurant = async (restaurantId, minutes = 30) => {
  const exists = await restaurantRepo.existsById(restaurantId);
  if (!exists) {
    throw new AppError('Restaurant not found', 404, 'NOT_FOUND');
  }
  const rows = await repo.listRecentByRestaurant(restaurantId, minutes);
  return itemResponse('Recent waiter calls fetched', rows);
};

const create = async (payload) => {
  const data = normalizeCreatePayload(payload);
  await assertCallTargets(data);
  const row = await repo.upsertByTable(data);
  const isNew = row?.ring_count === 1 && data.is_ring;
  return itemResponse(
    isNew ? 'Waiter call created' : 'Waiter call updated',
    row,
    isNew ? 201 : 200
  );
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant call waiter not found', 404, 'NOT_FOUND');
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant call waiter updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant call waiter not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant call waiter deleted', deleted.id);
};

module.exports = {
  list,
  getById,
  listRecentByRestaurant,
  create,
  update,
  remove,
};
