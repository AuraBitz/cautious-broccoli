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

const repo = dataaccess.restaurantOrderMaster;
const restaurantRepo = dataaccess.restaurantMaster;
const customerRepo = dataaccess.restaurantCustomerManagement;
const floorRepo = dataaccess.restaurantFloorMaster;
const tableRepo = dataaccess.restaurantTableMaster;
const bookingRepo = dataaccess.restaurantBookingMaster;
const { syncCustomerFromBooking } = require('../utils/sync-booking-customer');

const ORDER_STATUSES = ['pending', 'on_dine', 'completed'];

const intArraySchema = Joi.array().items(Joi.number().integer().positive()).default([]);

const createSchema = Joi.object({
  customer_id: Joi.number().integer().positive().allow(null),
  floor_id: Joi.number().integer().positive().allow(null),
  table_id: Joi.number().integer().positive().allow(null),
  restaurant_id: Joi.number().integer().positive().required(),
  order_items_id: intArraySchema,
  status: Joi.string()
    .trim()
    .valid(...ORDER_STATUSES)
    .default('pending'),
});

const updateSchema = Joi.object({
  customer_id: Joi.number().integer().positive().allow(null),
  floor_id: Joi.number().integer().positive().allow(null),
  table_id: Joi.number().integer().positive().allow(null),
  order_items_id: intArraySchema,
  status: Joi.string().trim().valid(...ORDER_STATUSES),
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant order master list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant order fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  if (!(await restaurantRepo.existsById(data.restaurant_id))) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }
  if (data.customer_id) {
    const customer = await customerRepo.findById(data.customer_id);
    if (!customer || Number(customer.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Customer not found for this restaurant', 400, 'INVALID_CUSTOMER');
    }
  }
  if (data.floor_id) {
    const floor = await floorRepo.findById(data.floor_id);
    if (!floor || Number(floor.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Floor not found for this restaurant', 400, 'INVALID_FLOOR');
    }
  }
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Restaurant order created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  if (data.customer_id) {
    const customer = await customerRepo.findById(data.customer_id);
    if (!customer || Number(customer.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Customer not found for this restaurant', 400, 'INVALID_CUSTOMER');
    }
  }
  if (data.floor_id) {
    const floor = await floorRepo.findById(data.floor_id);
    if (!floor || Number(floor.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Floor not found for this restaurant', 400, 'INVALID_FLOOR');
    }
  }
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant order updated', enriched ?? data);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Restaurant order deleted', deleted.id);
};

const publicUpdateSchema = Joi.object({
  order_items_id: intArraySchema,
  append_order_item_id: Joi.number().integer().positive(),
  status: Joi.string().trim().valid(...ORDER_STATUSES),
})
  .or('order_items_id', 'append_order_item_id', 'status')
  .min(1);

const getActive = async ({ restaurant_id, table_id, customer_id }) => {
  if (!restaurant_id || !table_id) {
    throw new AppError('restaurant_id and table_id are required', 400, 'INVALID_REQUEST');
  }
  const row = await repo.findActiveOrder({
    restaurant_id: Number(restaurant_id),
    table_id: Number(table_id),
    customer_id: customer_id != null ? Number(customer_id) : null,
  });
  return itemResponse(
    row ? 'Active restaurant order fetched' : 'No active restaurant order',
    row
  );
};

const ensureActiveSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  table_id: Joi.number().integer().positive().required(),
  floor_id: Joi.number().integer().positive().allow(null),
  customer_id: Joi.number().integer().positive().allow(null),
  booking_id: Joi.number().integer().positive().allow(null),
  order_items_id: intArraySchema,
  status: Joi.string()
    .trim()
    .valid(...ORDER_STATUSES)
    .default('pending'),
});

const ensureActive = async (payload) => {
  const data = validateSchema(ensureActiveSchema, payload);
  if (!(await restaurantRepo.existsById(data.restaurant_id))) {
    throw new AppError('Restaurant not found', 400, 'INVALID_RESTAURANT');
  }

  if (data.booking_id && !data.customer_id) {
    const booking = await bookingRepo.findById(data.booking_id);
    if (booking && Number(booking.restaurant_id) === Number(data.restaurant_id)) {
      const synced = await syncCustomerFromBooking(booking, bookingRepo);
      if (synced?.customer_id) {
        data.customer_id = synced.customer_id;
      }
    }
  }

  if (data.customer_id) {
    const customer = await customerRepo.findById(data.customer_id);
    if (!customer || Number(customer.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Customer not found for this restaurant', 400, 'INVALID_CUSTOMER');
    }
  }
  if (data.floor_id) {
    const floor = await floorRepo.findById(data.floor_id);
    if (!floor || Number(floor.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Floor not found for this restaurant', 400, 'INVALID_FLOOR');
    }
  }
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  const row = await repo.ensureActiveOrder(data);
  return itemResponse('Active restaurant order ready', row, row?.id ? 200 : 201);
};

const publicGetById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant order fetched', row);
};

const publicUpdate = async (id, payload) => {
  const data = validateSchema(publicUpdateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant order not found', 404, 'NOT_FOUND');
  }
  if (existing.status === 'completed') {
    throw new AppError('Completed orders cannot be updated', 400, 'ORDER_COMPLETED');
  }

  const patch = { ...data };
  if (data.append_order_item_id != null) {
    const currentItems = Array.isArray(existing.order_items_id)
      ? existing.order_items_id
      : [];
    patch.order_items_id = [...currentItems, data.append_order_item_id];
    delete patch.append_order_item_id;
  }

  await repo.update(id, patch);
  const enriched = await repo.findById(id);
  return itemResponse('Restaurant order updated', enriched ?? patch);
};

module.exports = {
  ORDER_STATUSES,
  list,
  getById,
  create,
  update,
  remove,
  getActive,
  ensureActive,
  publicGetById,
  publicUpdate,
};
