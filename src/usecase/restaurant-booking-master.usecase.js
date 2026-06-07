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
const { syncLiveMatrixForBooking } = require('../utils/live-matrix-sync');
const { syncCustomerFromBooking } = require('../utils/sync-booking-customer');

const repo = dataaccess.restaurantBookingMaster;
const restaurantRepo = dataaccess.restaurantMaster;
const customerRepo = dataaccess.restaurantCustomerManagement;
const tableRepo = dataaccess.restaurantTableMaster;

const createSchema = Joi.object({
  customer_id: Joi.number().integer().positive().allow(null),
  restaurant_id: Joi.number().integer().positive().required(),
  customer_name: Joi.string().trim().max(255).allow(null, ''),
  customer_phone: Joi.string().trim().max(50).allow(null, ''),
  booking_time: Joi.string().trim().max(20).allow(null, ''),
  booking_date: Joi.date().iso().allow(null),
  booking_status: Joi.string()
    .trim()
    .valid('pending', 'confirmed', 'cancelled', 'completed')
    .default('pending'),
  persons_count: Joi.number().integer().min(1).default(1),
  table_id: Joi.number().integer().positive().allow(null),
  is_manual_booking: Joi.boolean().default(false),
});

const updateSchema = Joi.object({
  customer_id: Joi.number().integer().positive().allow(null),
  customer_name: Joi.string().trim().max(255).allow(null, ''),
  customer_phone: Joi.string().trim().max(50).allow(null, ''),
  booking_time: Joi.string().trim().max(20).allow(null, ''),
  booking_date: Joi.date().iso().allow(null),
  booking_status: Joi.string()
    .trim()
    .valid('pending', 'confirmed', 'cancelled', 'completed'),
  persons_count: Joi.number().integer().min(1),
  table_id: Joi.number().integer().positive().allow(null),
  is_manual_booking: Joi.boolean(),
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Restaurant booking list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Restaurant booking not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Restaurant booking fetched', row);
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
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(data.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  const row = await repo.create(data);
  let enriched = await repo.findById(row.id);
  if (enriched) {
    enriched = await syncCustomerFromBooking(enriched, repo);
    if (enriched.table_id) {
      await syncLiveMatrixForBooking(
        enriched.restaurant_id,
        enriched.table_id,
        enriched.booking_status
      );
    }
  }
  return itemResponse('Restaurant booking created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Restaurant booking not found', 404, 'NOT_FOUND');
  }
  if (data.customer_id) {
    const customer = await customerRepo.findById(data.customer_id);
    if (!customer || Number(customer.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Customer not found for this restaurant', 400, 'INVALID_CUSTOMER');
    }
  }
  if (data.table_id) {
    const table = await tableRepo.findById(data.table_id);
    if (!table || Number(table.restaurant_id) !== Number(existing.restaurant_id)) {
      throw new AppError('Table not found for this restaurant', 400, 'INVALID_TABLE');
    }
  }
  await repo.update(id, data);
  let enriched = await repo.findById(id);
  if (enriched) {
    enriched = await syncCustomerFromBooking(enriched, repo);
    const oldTableId = existing.table_id;
    const newTableId = enriched.table_id;
    const statusChanged =
      data.booking_status !== undefined &&
      data.booking_status !== existing.booking_status;
    const tableChanged = data.table_id !== undefined && data.table_id !== oldTableId;

    if (oldTableId && tableChanged) {
      await syncLiveMatrixForBooking(
        existing.restaurant_id,
        oldTableId,
        'cancelled'
      );
    }
    if (newTableId && (tableChanged || statusChanged || data.booking_status !== undefined)) {
      await syncLiveMatrixForBooking(
        enriched.restaurant_id,
        newTableId,
        enriched.booking_status
      );
    }
  }
  return itemResponse('Restaurant booking updated', enriched ?? data);
};

const remove = async (id) => {
  const existing = await repo.findById(id);
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Restaurant booking not found', 404, 'NOT_FOUND');
  }
  if (existing?.table_id) {
    await syncLiveMatrixForBooking(
      existing.restaurant_id,
      existing.table_id,
      'cancelled'
    );
  }
  return deleteResponse('Restaurant booking deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
