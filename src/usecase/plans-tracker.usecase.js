const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { validateSchema } = require('../utils/joi-validate');
const { itemResponse, listResponse } = require('../utils/usecase-response');
const { listQuerySchema } = require('./common.schemas');
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

module.exports = { list, getPlan };
