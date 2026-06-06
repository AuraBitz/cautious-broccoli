const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'permission_master';

const COLUMNS = ['id', 'role_id', 'modules', 'created_at'];

const LIST_SELECT = `
  pm.id,
  pm.role_id,
  rm.role_name,
  rm.role_code,
  pm.modules,
  pm.created_at
`;

const FROM_SQL = `
  FROM ${TABLE} pm
  LEFT JOIN roles_master rm ON rm.id = pm.role_id
`;

const FILTER_COLUMN_MAP = {
  id: 'pm.id',
  role_id: 'pm.role_id',
  role_name: 'rm.role_name',
  role_code: 'rm.role_code',
  created_at: 'pm.created_at',
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
  insertColumns: ['role_id', 'modules'],
  updatableColumns: ['role_id', 'modules'],
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

const findByRoleId = async (roleId) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE pm.role_id = $1`,
    [roleId]
  );
  return result.rows[0] || null;
};

const create = async (payload) =>
  repo.create({
    ...payload,
    modules: payload.modules || {},
  });

module.exports = {
  ...repo,
  list,
  findById,
  findByRoleId,
  create,
};
