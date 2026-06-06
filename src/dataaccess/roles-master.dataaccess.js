const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'roles_master';

const COLUMNS = [
  'id',
  'role_code',
  'role_name',
  'description',
  'project_ids',
  'status',
  'created_at',
  'created_by',
];

const LIST_SELECT = `
  rm.id,
  rm.role_code,
  rm.role_name,
  rm.description,
  rm.project_ids,
  rm.status,
  rm.created_at,
  rm.created_by,
  cl.username AS created_by_name
`;

const FROM_SQL = `
  FROM ${TABLE} rm
  LEFT JOIN client_login_master cl ON cl.id = rm.created_by
`;

const FILTER_COLUMN_MAP = {
  id: 'rm.id',
  role_code: 'rm.role_code',
  role_name: 'rm.role_name',
  description: 'rm.description',
  project_ids: 'rm.project_ids',
  status: 'rm.status',
  created_at: 'rm.created_at',
  created_by: 'rm.created_by',
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
    'role_code',
    'role_name',
    'description',
    'project_ids',
    'status',
    'created_by',
  ],
  updatableColumns: [
    'role_code',
    'role_name',
    'description',
    'project_ids',
    'status',
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

const create = async (payload) =>
  repo.create({
    ...payload,
    project_ids: payload.project_ids || [],
  });

const listByProjectId = async (projectId) => {
  const pid = Number(projectId);
  if (!Number.isFinite(pid) || pid <= 0) return [];

  const result = await query(
    `SELECT ${LIST_SELECT}
     ${FROM_SQL}
     WHERE $1 = ANY(COALESCE(rm.project_ids, '{}'::int[]))
     ORDER BY rm.role_name ASC`,
    [pid]
  );
  return result.rows;
};

const isRoleAllowedForProject = async (roleId, projectId) => {
  const roles = await listByProjectId(projectId);
  return roles.some((row) => Number(row.id) === Number(roleId));
};

module.exports = {
  ...repo,
  list,
  findById,
  create,
  listByProjectId,
  isRoleAllowedForProject,
};
