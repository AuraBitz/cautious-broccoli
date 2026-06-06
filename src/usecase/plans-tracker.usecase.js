const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { validateSchema } = require('../utils/joi-validate');
const { itemResponse, listResponse } = require('../utils/usecase-response');
const { listQuerySchema, reportDownloadSchema } = require('./common.schemas');
const { generatePlansTrackerReport } = require('../excel-report/plans_tracker_report');
const planBusiness = require('./client-plan.business');

const getPlanSchema = Joi.object({
  client_login_id: Joi.number().integer().positive().required(),
  plan_id: Joi.number().integer().positive().required(),
  purchase_at: Joi.date().iso().optional(),
});

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await dataaccess.plansTracker.list(query);
  return listResponse('Plans tracker fetched', result);
};

/** POST get-plan — record purchase and activate client plan */
const getPlan = async (payload) => {
  const data = validateSchema(getPlanSchema, payload);
  const purchaseAt = data.purchase_at ? new Date(data.purchase_at) : new Date();
  const result = await planBusiness.recordPlanPurchase({
    clientLoginId: data.client_login_id,
    planId: data.plan_id,
    purchaseAt,
  });
  return itemResponse('Plan purchased', result, 201);
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
    filters.purchase_at = {
      op: 'date_between',
      value: [
        hasStart ? startDate : '1970-01-01',
        hasEnd ? endDate : new Date().toISOString().slice(0, 10),
      ],
    };
  }

  const result = await dataaccess.plansTracker.list({
    skip: 0,
    limit: 10000,
    sort: { field: 'purchase_at', order: 'desc' },
    filters,
  });

  const buffer = await generatePlansTrackerReport({
    rows: result.rows,
    startDate: hasStart ? startDate : undefined,
    endDate: hasEnd ? endDate : undefined,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  return {
    buffer,
    filename: `plans_tracker_report_${stamp}.xlsx`,
  };
};

module.exports = { list, getPlan, downloadReport };
