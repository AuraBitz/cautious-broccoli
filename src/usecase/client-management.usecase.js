const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const { generateClientsMasterReport } = require('../excel-report/clients_master_report');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const {
  listQuerySchema,
  CLIENT_PLAN_STATUS,
  reportDownloadSchema,
} = require('./common.schemas');
const planBusiness = require('./client-plan.business');

const clientRepo = dataaccess.clientManagement;
const loginRepo = dataaccess.clientLoginMaster;

const createSchema = Joi.object({
  restaurant_id: Joi.number().integer().positive().required(),
  owner_name: Joi.string().trim().min(1).required(),
  mobile: Joi.string().trim().allow(null, ''),
  email: Joi.string().trim().email().allow(null, ''),
  address: Joi.string().trim().allow(null, ''),
  city: Joi.string().trim().allow(null, ''),
  state: Joi.string().trim().allow(null, ''),
  country: Joi.string().trim().allow(null, ''),
  plan_id: Joi.number().integer().allow(null),
  applied_at: Joi.date().iso().allow(null),
  project_id: Joi.number().integer().allow(null),
  plan_start_at: Joi.date().iso().allow(null),
  plan_status: Joi.string()
    .valid(...CLIENT_PLAN_STATUS)
    .default('Active'),
  login_id: Joi.number().integer().positive().allow(null),
});

const updateSchema = createSchema.fork(
  ['restaurant_id', 'owner_name'],
  (field) => field.optional()
);

const assertRestaurantExists = async (restaurantId) => {
  if (restaurantId == null) return;
  const exists = await dataaccess.restaurantMaster.existsById(restaurantId);
  if (!exists) {
    throw new AppError('restaurant_id not found', 400, 'INVALID_RESTAURANT_ID');
  }
};

const assertLoginExists = async (loginId) => {
  if (loginId == null) return;
  const exists = await loginRepo.existsById(loginId);
  if (!exists) {
    throw new AppError('login_id not found', 400, 'INVALID_LOGIN_ID');
  }
};

const assertPlanExists = async (planId) => {
  if (planId == null) return;
  const exists = await dataaccess.plansMaster.existsById(planId);
  if (!exists) {
    throw new AppError('plan_id not found', 400, 'INVALID_PLAN_ID');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await clientRepo.list(query);
  const rows = await planBusiness.syncClientsPlan(result.rows);
  return listResponse('Clients fetched', { ...result, rows });
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertRestaurantExists(data.restaurant_id);
  await assertLoginExists(data.login_id);
  await assertPlanExists(data.plan_id);

  const prepared = await planBusiness.preparePlanOnSave(data);
  const row = await clientRepo.create(prepared);

  if (row.login_id && row.plan_id) {
    await planBusiness.recordPlanPurchase({
      clientLoginId: row.login_id,
      planId: row.plan_id,
    });
  } else {
    await planBusiness.deactivateLoginIfExpired(
      row.login_id,
      row.plan_remain_days === 0
    );
  }

  const synced = await planBusiness.syncClientPlan(
    await clientRepo.findById(row.id)
  );
  return itemResponse('Client created', synced, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await clientRepo.findById(id);
  if (!existing) {
    throw new AppError('Client not found', 404, 'NOT_FOUND');
  }

  if (data.restaurant_id !== undefined) {
    await assertRestaurantExists(data.restaurant_id);
  }
  await assertLoginExists(data.login_id);
  if (data.plan_id !== undefined) {
    await assertPlanExists(data.plan_id);
  }

  const merged = {
    ...existing,
    ...data,
    plan_start_at: data.plan_start_at ?? existing.plan_start_at,
    plan_id: data.plan_id ?? existing.plan_id,
  };

  const prepared = await planBusiness.preparePlanOnSave(merged);
  const updatePayload = { ...data };

  if (merged.plan_start_at && merged.plan_id) {
    updatePayload.plan_remain_days = prepared.plan_remain_days;
    updatePayload.plan_status = prepared.plan_status;
  }

  const row = await clientRepo.update(id, updatePayload);

  const planChanged =
    data.plan_id !== undefined &&
    Number(data.plan_id) !== Number(existing.plan_id);

  if (planChanged && row?.login_id && row?.plan_id) {
    await planBusiness.recordPlanPurchase({
      clientLoginId: row.login_id,
      planId: row.plan_id,
    });
  } else {
    await planBusiness.deactivateLoginIfExpired(
      row.login_id,
      row.plan_remain_days === 0
    );
    await planBusiness.activateLoginIfActive(
      row.login_id,
      row.plan_remain_days > 0
    );
  }

  const synced = await planBusiness.syncClientPlan(
    await clientRepo.findById(id)
  );
  return itemResponse('Client updated', synced);
};

const getById = async (id) => {
  const row = await clientRepo.findById(id);
  if (!row) {
    throw new AppError('Client not found', 404, 'NOT_FOUND');
  }
  const synced = await planBusiness.syncClientPlan(row);
  return itemResponse('Client fetched', synced);
};

const remove = async (id) => {
  const deleted = await clientRepo.remove(id);
  if (!deleted) {
    throw new AppError('Client not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Client deleted', deleted.id);
};

const downloadReport = async (payload) => {
  const { start_date: startDate, end_date: endDate } = validateSchema(
    reportDownloadSchema,
    payload
  );

  const filters = {};
  const hasStart = Boolean(startDate);
  const hasEnd = Boolean(endDate);

  if (hasStart || hasEnd) {
    filters.created_at = {
      op: 'date_between',
      value: [
        hasStart ? startDate : '1970-01-01',
        hasEnd ? endDate : new Date().toISOString().slice(0, 10),
      ],
    };
  }

  const result = await clientRepo.list({
    skip: 0,
    limit: 10000,
    sort: { field: 'created_at', order: 'desc' },
    filters,
  });

  const rows = await planBusiness.syncClientsPlan(result.rows);
  const buffer = await generateClientsMasterReport({
    rows,
    startDate: hasStart ? startDate : undefined,
    endDate: hasEnd ? endDate : undefined,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    buffer,
    filename: `clients_master_report_${stamp}.xlsx`,
  };
};

module.exports = { list, getById, create, update, remove, downloadReport };
