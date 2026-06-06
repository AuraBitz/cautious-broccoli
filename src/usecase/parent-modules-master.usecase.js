const Joi = require('joi');
const dataaccess = require('../dataaccess');
const { AppError } = require('../utils');
const { validateSchema } = require('../utils/joi-validate');
const {
  listResponse,
  itemResponse,
  deleteResponse,
} = require('../utils/usecase-response');
const {
  listQuerySchema,
  optionalMasterStatusSchema,
} = require('./common.schemas');

const repo = dataaccess.parentModulesMaster;
const projectRepo = dataaccess.projectMaster;

const createSchema = Joi.object({
  module_name: Joi.string().trim().min(1).required(),
  status: optionalMasterStatusSchema.default('active'),
  project_id: Joi.number().integer().positive().allow(null),
  created_by: Joi.number().integer().positive().allow(null),
});

const updateSchema = Joi.object({
  module_name: Joi.string().trim().min(1),
  status: optionalMasterStatusSchema,
  project_id: Joi.number().integer().positive().allow(null),
}).min(1);

const assertProjectExists = async (projectId) => {
  if (projectId == null) return;
  const exists = await projectRepo.existsById(projectId);
  if (!exists) {
    throw new AppError('Project not found', 400, 'INVALID_PROJECT');
  }
};

const list = async (listPayload) => {
  const query = validateSchema(listQuerySchema, listPayload);
  const result = await repo.list(query);
  return listResponse('Parent module list fetched', result);
};

const getById = async (id) => {
  const row = await repo.findById(id);
  if (!row) {
    throw new AppError('Parent module not found', 404, 'NOT_FOUND');
  }
  return itemResponse('Parent module fetched', row);
};

const create = async (payload) => {
  const data = validateSchema(createSchema, payload);
  await assertProjectExists(data.project_id);
  const row = await repo.create(data);
  if (data.project_id) {
    await projectRepo.addModuleToProject(data.project_id, row.id);
  }
  const enriched = await repo.findById(row.id);
  return itemResponse('Parent module created', enriched ?? row, 201);
};

const update = async (id, payload) => {
  const data = validateSchema(updateSchema, payload);
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Parent module not found', 404, 'NOT_FOUND');
  }
  if (data.project_id !== undefined) {
    await assertProjectExists(data.project_id);
  }
  const row = await repo.update(id, data);
  if (data.project_id !== undefined) {
    await projectRepo.syncModuleProject(
      id,
      data.project_id,
      existing.project_id
    );
  }
  const enriched = await repo.findById(id);
  return itemResponse('Parent module updated', enriched ?? row);
};

const remove = async (id) => {
  const existing = await repo.findById(id);
  if (!existing) {
    throw new AppError('Parent module not found', 404, 'NOT_FOUND');
  }
  await projectRepo.removeModuleFromAllProjects(id);
  const deleted = await repo.remove(id);
  return deleteResponse('Parent module deleted', deleted.id);
};

module.exports = { list, getById, create, update, remove };
