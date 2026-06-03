const Joi = require('joi');

const MASTER_STATUS = ['active', 'inactive'];
const CLIENT_PLAN_STATUS = ['Active', 'Deactivate', 'Blocked'];

const listQuerySchema = Joi.object({
  skip: Joi.number().integer().min(0).default(0),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.object({
    field: Joi.string().trim(),
    order: Joi.string().valid('asc', 'desc', 'ASC', 'DESC').insensitive(),
  }).default({}),
  filters: Joi.object().pattern(Joi.string(), Joi.any()).default({}),
});

const optionalMasterStatusSchema = Joi.string()
  .valid(...MASTER_STATUS)
  .insensitive()
  .lowercase()
  .optional();

const intIdArray = Joi.array()
  .items(Joi.number().integer().positive())
  .default([]);

module.exports = {
  listQuerySchema,
  optionalMasterStatusSchema,
  intIdArray,
  CLIENT_PLAN_STATUS,
};
