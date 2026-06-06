const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'project_role_master';

const COLUMNS = [
  'id',
  'code',
  'role_name',
  'description',
  'status',
  'created_at',
];

const LIST_SELECT = `
  prm.id,
  prm.code,
  prm.role_name,
  prm.description,
  prm.status,
  prm.created_at
`;

const FROM_SQL = `FROM ${TABLE} prm`;

const FILTER_COLUMN_MAP = {
  id: 'prm.id',
  code: 'prm.code',
  role_name: 'prm.role_name',
  status: 'prm.status',
  created_at: 'prm.created_at',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = FILTER_FIELDS;

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `prm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: ['code', 'role_name', 'description', 'status'],
  updatableColumns: ['code', 'role_name', 'description', 'status'],
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
  const sortColumn =
    FILTER_COLUMN_MAP[sortField] || `prm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE prm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const existsAllByIds = async (ids = []) => {
  if (!ids.length) return true;
  const result = await query(
    `SELECT COUNT(*)::int AS count FROM ${TABLE} WHERE id = ANY($1::int[])`,
    [ids]
  );
  return result.rows[0].count === ids.length;
};

const listByProjectId = async (projectId) => {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) return [];

  const result = await query(
    `SELECT DISTINCT ${LIST_SELECT}
     ${FROM_SQL}
     INNER JOIN project_permission_master ppm
       ON prm.id = ANY(COALESCE(ppm.role_ids, '{}'::int[]))
     WHERE ppm.overall_access = false
       AND cardinality(COALESCE(ppm.project_ids, '{}'::int[])) > 0
       AND $1 = ANY(COALESCE(ppm.project_ids, '{}'::int[]))
     ORDER BY prm.role_name ASC`,
    [pid]
  );
  return result.rows;
};

const isRoleAllowedForProject = async (roleId, projectId) => {
  const roles = await listByProjectId(projectId);
  return roles.some((row) => Number(row.id) === Number(roleId));
};

const existsByCode = async (code, excludeId = null) => {
  const result = await query(
    `SELECT 1 FROM ${TABLE}
     WHERE lower(code) = lower($1)
       AND ($2::int IS NULL OR id <> $2)
     LIMIT 1`,
    [code, excludeId]
  );
  return result.rowCount > 0;
};

module.exports = {
  ...repo,
  list,
  findById,
  listByProjectId,
  isRoleAllowedForProject,
  existsAllByIds,
  existsByCode,
};
