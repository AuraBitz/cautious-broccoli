const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'child_module_master';

const COLUMNS = [
  'id',
  'parent_module_id',
  'child_module_name',
  'created_at',
  'created_by',
];

const LIST_SELECT = `
  cm.id,
  cm.parent_module_id,
  cm.child_module_name,
  cm.created_at,
  cm.created_by,
  pm.module_name AS parent_module_name,
  cl.username AS created_by_name
`;

const FROM_SQL = `
  FROM ${TABLE} cm
  LEFT JOIN parent_modules_master pm ON pm.id = cm.parent_module_id
  LEFT JOIN client_login_master cl ON cl.id = cm.created_by
`;

const FILTER_COLUMN_MAP = {
  id: 'cm.id',
  parent_module_id: 'cm.parent_module_id',
  parent_module_name: 'pm.module_name',
  project_id: 'pm.project_id',
  child_module_name: 'cm.child_module_name',
  created_at: 'cm.created_at',
  created_by: 'cm.created_by',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `cm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: ['parent_module_id', 'child_module_name', 'created_by'],
  updatableColumns: ['parent_module_id', 'child_module_name'],
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `cm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE cm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const listByParentModuleIds = async (parentIds = []) => {
  if (!parentIds.length) return [];
  const result = await query(
    `SELECT ${LIST_SELECT}
     ${FROM_SQL}
     WHERE cm.parent_module_id = ANY($1::int[])
     ORDER BY pm.module_name ASC, cm.child_module_name ASC`,
    [parentIds]
  );
  return result.rows;
};

module.exports = {
  ...repo,
  list,
  findById,
  listByParentModuleIds,
};
