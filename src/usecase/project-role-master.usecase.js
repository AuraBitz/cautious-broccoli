const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const { listQuerySchema, optionalMasterStatusSchema } = require('./common.schemas');

const repo = dataaccess.projectRoleMaster;

const createSchema = Joi.object({
  code: Joi.string().trim().min(1).max(100).required(),
  role_name: Joi.string().trim().min(1).required(),
  description: Joi.string().trim().allow(null, ''),
  status: optionalMasterStatusSchema.default('active'),
});

const updateSchema = Joi.object({
  code: Joi.string().trim().min(1).max(100),
  role_name: Joi.string().trim().min(1),
  description: Joi.string().trim().allow(null, ''),
  status: optionalMasterStatusSchema,
}).min(1);

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Project role list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Project role not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Project role fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  const duplicate = await repo.existsByCode(data.code);
  if (duplicate) {
    throw new AppError('Role code already exists', 409, 'DUPLICATE_CODE');
  }
  const row = await repo.create({
    ...data,
    description: data.description || null,
  });
  return itemResponse('Project role created', row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Project role not found', 404, 'NOT_FOUND');
  }
  if (data.code) {
    const duplicate = await repo.existsByCode(data.code, id);
    if (duplicate) {
      throw new AppError('Role code already exists', 409, 'DUPLICATE_CODE');
    }
  }
  const row = await repo.update(id, {
    ...data,
    description:
      data.description !== undefined ? data.description || null : undefined,
  });
  const enriched = await repo.findById(id);
  return itemResponse('Project role updated', enriched ?? row);
};

const remove = async (id) => {
  const deleted = await repo.remove(id);
  if (!deleted) {
    throw new AppError('Project role not found', 404, 'NOT_FOUND');
  }
  return deleteResponse('Project role deleted', deleted.id);
};

const listByProject = async (projectId) => {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) {
    throw new AppError('Invalid project id', 400, 'INVALID_PROJECT');
  }
  const rows = await repo.listByProjectId(pid);
  return itemResponse('Project roles for project fetched', { rows, total: rows.length });
};

module.exports = {
  list,
  getById,
  create,
  update,
  remove,
  listByProject,
};
