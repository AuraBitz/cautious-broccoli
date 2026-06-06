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

const repo = dataaccess.permissionsMaster;
const rolesRepo = dataaccess.rolesMaster;

const moduleFlagsSchema = Joi.object({
  view: Joi.boolean().required(),
  create: Joi.boolean().required(),
  edit: Joi.boolean().required(),
  delete: Joi.boolean().required(),
  download: Joi.boolean().required(),
});

const modulesSchema = Joi.object()
  .pattern(Joi.string().trim().min(1), moduleFlagsSchema)
  .required();

const createSchema = Joi.object({
  role_id: Joi.number().integer().positive().required(),
  modules: modulesSchema,
});

const updateSchema = Joi.object({
  role_id: Joi.number().integer().positive(),
  modules: modulesSchema,
}).min(1);

const assertRoleExists = async (roleId) => {
  const row = await rolesRepo.findById(roleId);
  if (!row) {
    throw new AppError('Role not found', 400, 'INVALID_ROLE');
  }
};

const assertRoleNotTaken = async (roleId, excludeId = null) => {
  const existing = await repo.findByRoleId(roleId);
  if (existing && existing.id !== excludeId) {
    throw new AppError(
      'Permissions already exist for this role',
      400,
      'DUPLICATE_ROLE_PERMISSION'
    );
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Permission list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Permission not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Permission fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertRoleExists(data.role_id);
  await assertRoleNotTaken(data.role_id);
  const row = await repo.create(data);
  const enriched = await repo.findById(row.id);
  return itemResponse('Permission created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Permission not found', 404, 'NOT_FOUND');
  }
  if (data.role_id) {
    await assertRoleExists(data.role_id);
    await assertRoleNotTaken(data.role_id, id);
  }
  const row = await repo.update(id, data);
  const enriched = await repo.findById(id);
  return itemResponse('Permission updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Permission not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Permission deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
