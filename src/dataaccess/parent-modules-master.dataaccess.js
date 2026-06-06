const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'parent_modules_master';

const COLUMNS = [
  'id',
  'module_name',
  'status',
  'project_id',
  'created_at',
  'created_by',
];

const LIST_SELECT = `
  pm.id,
  pm.module_name,
  pm.status,
  pm.project_id,
  pm.created_at,
  pm.created_by,
  pr.name AS project_name,
  cl.username AS created_by_name
`;

const FROM_SQL = `
  FROM ${TABLE} pm
  LEFT JOIN project_master pr ON pr.id = pm.project_id
  LEFT JOIN client_login_master cl ON cl.id = pm.created_by
`;

const FILTER_COLUMN_MAP = {
  id: 'pm.id',
  module_name: 'pm.module_name',
  status: 'pm.status',
  project_id: 'pm.project_id',
  project_name: 'pr.name',
  created_at: 'pm.created_at',
  created_by: 'pm.created_by',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `pm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: ['module_name', 'status', 'project_id', 'created_by'],
  updatableColumns: ['module_name', 'status', 'project_id'],
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `pm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE pm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const listByIds = async (ids = []) => {
  if (!ids.length) return [];
  const result = await query(
    `SELECT ${LIST_SELECT}
     ${FROM_SQL}
     WHERE pm.id = ANY($1::int[])
       AND pm.status::text <> 'inactive'
     ORDER BY pm.module_name ASC`,
    [ids]
  );
  return result.rows;
};

module.exports = {
  ...repo,
  list,
  findById,
  listByIds,
};
