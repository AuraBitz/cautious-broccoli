const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, CLIENT_PLAN_STATUS } = require('./common.schemas');
const planBusiness = require('./client-plan.business');

const clientRepo = dataaccess.clientManagement;
const loginRepo = dataaccess.clientLoginMaster;

const createSchema = Joi.object({
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

const updateSchema = createSchema.fork(['owner_name'], (field) =>
  field.optional()
);

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
  await assertLoginExists(data.login_id);
  await assertPlanExists(data.plan_id);

  const prepared = await planBusiness.preparePlanOnSave(data);
  const row = await clientRepo.create(prepared);
  await planBusiness.deactivateLoginIfExpired(
    row.login_id,
    row.plan_remain_days === 0
  );

  const synced = await planBusiness.syncClientPlan(row);
  return itemResponse('Client created', synced, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await clientRepo.findById(id);
  if (!existing) {
    throw new AppError('Client not found', 404, 'NOT_FOUND');
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
  await planBusiness.deactivateLoginIfExpired(
    row.login_id,
    row.plan_remain_days === 0
  );

  const synced = await planBusiness.syncClientPlan(row);
  return itemResponse('Client updated', synced);
};

const remove = async (id) => {
  const deleted = await clientRepo.remove(id);
  if (!deleted) {
    throw new AppError('Client not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Client deleted', deleted.id);
};

module.exports = { list, create, update, remove };
