const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_master';

const COLUMNS = [
  'id',
  'restaurant_name',
  'restaurant_address',
  'city',
  'state',
  'country',
  'restaurant_mobile',
  'status',
  'project_id',
  'created_at',
  'created_by',
];

const LIST_SELECT = `
  rm.id,
  rm.restaurant_name,
  rm.restaurant_address,
  rm.city,
  rm.state,
  rm.country,
  rm.restaurant_mobile,
  rm.status,
  rm.project_id,
  pr.name AS project_name,
  rm.created_at,
  rm.created_by,
  cl.username AS created_by_name,
  cm.owner_name,
  COALESCE(cm.email, cl.email) AS restaurant_email,
  cm.plan_id
`;

const FROM_SQL = `
  FROM ${TABLE} rm
  LEFT JOIN project_master pr ON pr.id = rm.project_id
  LEFT JOIN client_management cm ON cm.restaurant_id = rm.id
  LEFT JOIN client_login_master cl ON cl.id = COALESCE(cm.login_id, rm.created_by)
`;

const FILTER_COLUMN_MAP = {
  id: 'rm.id',
  restaurant_name: 'rm.restaurant_name',
  restaurant_address: 'rm.restaurant_address',
  city: 'rm.city',
  state: 'rm.state',
  country: 'rm.country',
  restaurant_mobile: 'rm.restaurant_mobile',
  status: 'rm.status',
  project_id: 'rm.project_id',
  project_name: 'pr.name',
  created_at: 'rm.created_at',
  created_by: 'rm.created_by',
  owner_name: 'cm.owner_name',
  restaurant_email: 'COALESCE(cm.email, cl.email)',
  plan_id: 'cm.plan_id',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `rm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'restaurant_name',
    'restaurant_address',
    'city',
    'state',
    'country',
    'restaurant_mobile',
    'status',
    'project_id',
    'created_by',
  ],
  updatableColumns: [
    'restaurant_name',
    'restaurant_address',
    'city',
    'state',
    'country',
    'restaurant_mobile',
    'status',
    'project_id',
  ],
  defaultSortField: 'created_at',
  filterFields: FILTER_FIELDS,
  sortFields: SORT_FIELDS,
});

const list = async (body) => {
  const { skip, limit } = parsePagination(body);
  const { field: sortField, order: sortOrder } = parseSort(
    body,
    SORT_FIELDS,
    'created_at'
  );
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rm."${sortField}"`;
  const { whereSql, values, paramIndex: whereParamIndex } =
    buildJoinedWhereClause(body.filters);

  let paramIndex = whereParamIndex;
  const orderSql = `ORDER BY ${sortColumn} ${sortOrder}`;
  const limitSql = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const listValues = [...values, limit, skip];

  const listQuery = `
    SELECT ${LIST_SELECT}
    ${FROM_SQL}
    ${whereSql}
    ${orderSql}
    ${limitSql}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    ${FROM_SQL}
    ${whereSql}
  `;

  const [rowsResult, countResult] = await Promise.all([
    query(listQuery, listValues),
    query(countQuery, values),
  ]);

  return {
    rows: rowsResult.rows,
    total: countResult.rows[0].total,
    skip,
    limit,
    sort: { field: sortField, order: sortOrder.toLowerCase() },
  };
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  ...repo,
  list,
  findById,
};
