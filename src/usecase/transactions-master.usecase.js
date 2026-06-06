const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, reportDownloadSchema } = require('./common.schemas');
const { generateTransactionsMasterReport } = require('../excel-report/transactions_master_report');

const repo = dataaccess.transactionsMaster;
const paymentTypeRepo = dataaccess.paymentTypeMaster;
const projectRepo = dataaccess.projectMaster;
const clientRepo = dataaccess.clientManagement;
const planRepo = dataaccess.plansMaster;

const optionalIntId = Joi.number().integer().positive().allow(null);

const createSchema = Joi.object({
  payment_type_id: Joi.number().integer().positive().required(),
  account: Joi.string().trim().max(255).allow(null, ''),
  project_id: optionalIntId,
  number: Joi.string().trim().max(50).allow(null, ''),
  transaction_no: Joi.string().trim().min(1).max(100).required(),
  customer_id: optionalIntId,
  transaction_date: Joi.date().iso().required(),
  plan_id: optionalIntId,
});

const updateSchema = Joi.object({
  payment_type_id: Joi.number().integer().positive(),
  account: Joi.string().trim().max(255).allow(null, ''),
  project_id: optionalIntId,
  number: Joi.string().trim().max(50).allow(null, ''),
  transaction_no: Joi.string().trim().min(1).max(100),
  customer_id: optionalIntId,
  transaction_date: Joi.date().iso(),
  plan_id: optionalIntId,
}).min(1);

const assertPaymentTypeExists = async (paymentTypeId) => {
  const row = await paymentTypeRepo.findById(paymentTypeId);
  if (!row) {
    throw new AppError('Payment type not found', 400, 'INVALID_PAYMENT_TYPE');
  }
};

const assertProjectExists = async (projectId) => {
  if (projectId == null) return;
  const row = await projectRepo.findById(projectId);
  if (!row) {
    throw new AppError('Project not found', 400, 'INVALID_PROJECT');
  }
};

const assertCustomerExists = async (customerId) => {
  if (customerId == null) return;
  const row = await clientRepo.findById(customerId);
  if (!row) {
    throw new AppError('Customer not found', 400, 'INVALID_CUSTOMER');
  }
};

const assertPlanExists = async (planId) => {
  if (planId == null) return;
  const row = await planRepo.findById(planId);
  if (!row) {
    throw new AppError('Plan not found', 400, 'INVALID_PLAN');
  }
};

const normalizePayload = (data) => ({
  ...data,
  account: data.account?.trim() || null,
  number: data.number?.trim() || null,
  transaction_no: data.transaction_no?.trim(),
});

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Transaction list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Transaction not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Transaction fetched', row);
};

const create = async (payload) => {
  const data = normalizePayload(validateSchema(createSchema, payload));
  await assertPaymentTypeExists(data.payment_type_id);
  await assertProjectExists(data.project_id);
  await assertCustomerExists(data.customer_id);
  await assertPlanExists(data.plan_id);
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Transaction created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = normalizePayload(validateSchema(updateSchema, payload));
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Transaction not found', 404, 'NOT_FOUND');
  }
  if (data.payment_type_id) {
    await assertPaymentTypeExists(data.payment_type_id);
  }
  if (data.project_id !== undefined) {
    await assertProjectExists(data.project_id);
  }
  if (data.customer_id !== undefined) {
    await assertCustomerExists(data.customer_id);
  }
  if (data.plan_id !== undefined) {
    await assertPlanExists(data.plan_id);
  }
  const row = await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Transaction updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Transaction not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Transaction deleted', deleted.id);
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
    filters.transaction_date = {
      op: 'date_between',
      value: [
        hasStart ? startDate : '1970-01-01',
        hasEnd ? endDate : new Date().toISOString().slice(0, 10),
      ],
    };
  }

  const result = await repo.list({
    skip: 0,
    limit: 10000,
    sort: { field: 'transaction_date', order: 'desc' },
    filters,
  });

  const buffer = await generateTransactionsMasterReport({
    rows: result.rows,
    startDate: hasStart ? startDate : undefined,
    endDate: hasEnd ? endDate : undefined,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    buffer,
    filename: `transactions_master_report_${stamp}.xlsx`,
  };
};

module.exports = { list, getById, create, update, remove, downloadReport };
