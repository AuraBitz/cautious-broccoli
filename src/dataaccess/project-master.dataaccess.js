const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');

const TABLE = 'project_master';

const repo = createCrudRepository({
  table: TABLE,
  columns: [
    'id',
    'name',
    'description',
    'plan_ids',
    'project_start_at',
    'status',
    'module_ids',
  ],
  insertColumns: [
    'name',
    'description',
    'plan_ids',
    'project_start_at',
    'status',
    'module_ids',
  ],
  updatableColumns: [
    'name',
    'description',
    'plan_ids',
    'project_start_at',
    'status',
    'module_ids',
  ],
  defaultSortField: 'id',
  filterFields: ['id', 'name', 'status', 'project_start_at'],
  sortFields: [
    'id',
    'name',
    'description',
    'plan_ids',
    'project_start_at',
    'status',
    'module_ids',
  ],
});

const findProjectByPlanId = async (planId) => {
  const result = await query(
    `SELECT id, name, plan_ids
     FROM ${TABLE}
     WHERE $1 = ANY(COALESCE(plan_ids, '{}'))
     LIMIT 1`,
    [planId]
  );
  return result.rows[0] || null;
};

const addPlanToProject = async (projectId, planId) => {
  await query(
    `UPDATE ${TABLE}
     SET plan_ids = CASE
       WHEN $2 = ANY(COALESCE(plan_ids, '{}')) THEN plan_ids
       ELSE array_append(COALESCE(plan_ids, '{}'), $2)
     END
     WHERE id = $1`,
    [projectId, planId]
  );
};

const removePlanFromProject = async (projectId, planId) => {
  await query(
    `UPDATE ${TABLE}
     SET plan_ids = array_remove(COALESCE(plan_ids, '{}'), $2)
     WHERE id = $1`,
    [projectId, planId]
  );
};

const removePlanFromAllProjects = async (planId) => {
  await query(
    `UPDATE ${TABLE}
     SET plan_ids = array_remove(COALESCE(plan_ids, '{}'), $1)
     WHERE $1 = ANY(COALESCE(plan_ids, '{}'))`,
    [planId]
  );
};

const syncPlanProject = async (planId, newProjectId, oldProjectId) => {
  if (oldProjectId && Number(oldProjectId) !== Number(newProjectId)) {
    await removePlanFromProject(oldProjectId, planId);
  }
  if (newProjectId) {
    await addPlanToProject(newProjectId, planId);
  }
};

module.exports = {
  ...repo,
  findProjectByPlanId,
  addPlanToProject,
  removePlanFromProject,
  removePlanFromAllProjects,
  syncPlanProject,
};
