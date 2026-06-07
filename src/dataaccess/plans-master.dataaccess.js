const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const { buildListQuery } = require('../utils/list-query-builder');

const TABLE = 'plans_master';

const COLUMNS = [
  'id',
  'plan_type',
  'plan_valid_days',
  'plan_modules_id',
  'amount',
  'discount_amount',
  'features',
  'range_type',
  'project_id',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
];

const PROJECT_NAME_SQL = `(
  SELECT p.name
  FROM project_master p
  WHERE p.id = ${TABLE}.project_id
  LIMIT 1
) AS project_name`;

const LIST_SELECT_COLUMNS = [...COLUMNS, PROJECT_NAME_SQL];

const FILTER_FIELDS = [
  'id',
  'plan_type',
  'plan_valid_days',
  'amount',
  'discount_amount',
  'range_type',
  'project_id',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
];

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'plan_type',
    'plan_valid_days',
    'plan_modules_id',
    'amount',
    'discount_amount',
    'features',
    'range_type',
    'project_id',
    'created_by',
    'updated_by',
  ],
  updatableColumns: [
    'plan_type',
    'plan_valid_days',
    'plan_modules_id',
    'amount',
    'discount_amount',
    'features',
    'range_type',
    'project_id',
    'updated_by',
  ],
  defaultSortField: 'created_at',
  filterFields: FILTER_FIELDS,
  sortFields: COLUMNS,
});

const list = async (body) => {
  const built = buildListQuery({
    table: TABLE,
    selectColumns: LIST_SELECT_COLUMNS,
    allowedFilterFields: FILTER_FIELDS,
    allowedSortFields: COLUMNS,
    defaultSortField: 'created_at',
    body,
  });

  const [rowsResult, countResult] = await Promise.all([
    query(built.listQuery, built.listValues),
    query(built.countQuery, built.countValues),
  ]);

  return {
    rows: rowsResult.rows,
    total: countResult.rows[0].total,
    skip: built.skip,
    limit: built.limit,
    sort: built.sort,
  };
};

const findByIdWithProject = async (id) => {
  const result = await query(
    `SELECT ${COLUMNS.join(', ')}, ${PROJECT_NAME_SQL}
     FROM ${TABLE}
     WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (payload) =>
  repo.create({
    ...payload,
    plan_modules_id: payload.plan_modules_id || [],
    features: Array.isArray(payload.features) ? payload.features : [],
    range_type: payload.range_type === 'annually' ? 'annually' : 'monthly',
    updated_by: payload.created_by ?? payload.updated_by ?? null,
  });

const update = async (id, payload) =>
  repo.update(id, payload, ['updated_at = NOW()']);

const findByIds = async (ids = []) => {
  if (!ids.length) return [];
  const result = await query(
    `SELECT id, plan_valid_days FROM ${TABLE} WHERE id = ANY($1::int[])`,
    [ids]
  );
  return result.rows;
};

module.exports = {
  ...repo,
  list,
  findById: findByIdWithProject,
  create,
  update,
  findByIds,
};
