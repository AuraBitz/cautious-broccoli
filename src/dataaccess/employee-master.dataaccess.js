const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');
const {
  employeeRoleHasProject,
  EMPLOYEE_PROJECTS_LATERAL_SELECT,
} = require('../utils/project-role-scope');

const TABLE = 'employee_master';

/** Login projects derived via emp_role -> project_permission_master */
const PROJECT_SCOPE_LATERAL = `
  LEFT JOIN LATERAL (
    ${EMPLOYEE_PROJECTS_LATERAL_SELECT}
  ) emp_proj ON true
`;

const COLUMNS = [
  'id',
  'emp_code',
  'employee_name',
  'mobile',
  'email',
  'address',
  'emp_role',
  'role_master_id',
  'status',
  'emp_login_id',
  'created_at',
  'updated_at',
];

const LIST_SELECT = `
  em.id,
  em.emp_code,
  em.employee_name,
  em.mobile,
  em.email,
  em.address,
  em.emp_role,
  em.role_master_id,
  em.role_master_id AS project_role_id,
  emp_proj.project_ids,
  emp_proj.project_id,
  emp_proj.project_name,
  prm.role_name AS emp_role_name,
  prm.code AS emp_role_code,
  rlm.role_name AS project_role_name,
  rlm.role_code AS project_role_code,
  em.status,
  em.emp_login_id,
  em.created_at,
  em.updated_at
`;

const FROM_SQL = `
  FROM ${TABLE} em
  LEFT JOIN project_role_master prm ON prm.id = em.emp_role
  LEFT JOIN roles_master rlm ON rlm.id = em.role_master_id
  ${PROJECT_SCOPE_LATERAL}
`;

const FILTER_COLUMN_MAP = {
  id: 'em.id',
  emp_code: 'em.emp_code',
  employee_name: 'em.employee_name',
  mobile: 'em.mobile',
  email: 'em.email',
  emp_role: 'em.emp_role',
  role_master_id: 'em.role_master_id',
  emp_role_name: 'prm.role_name',
  project_role_name: 'rlm.role_name',
  status: 'em.status',
  emp_login_id: 'em.emp_login_id',
  created_at: 'em.created_at',
  updated_at: 'em.updated_at',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `em."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'emp_code',
    'employee_name',
    'mobile',
    'email',
    'address',
    'emp_role',
    'role_master_id',
    'status',
    'emp_login_id',
  ],
  updatableColumns: [
    'emp_code',
    'employee_name',
    'mobile',
    'email',
    'address',
    'emp_role',
    'role_master_id',
    'status',
    'emp_login_id',
  ],
  defaultSortField: 'created_at',
  filterFields: FILTER_FIELDS,
  sortFields: SORT_FIELDS,
});

const appendProjectScope = (scopeProjectId, whereSql, values, paramIndex) => {
  const projectId = Number(scopeProjectId);
  if (!Number.isFinite(projectId) || projectId <= 0) {
    return { whereSql, values, paramIndex };
  }

  const clause = employeeRoleHasProject(`$${paramIndex}`);
  const nextValues = [...values, projectId];
  const nextWhere = whereSql ? `${whereSql} AND ${clause}` : `WHERE ${clause}`;
  return { whereSql: nextWhere, values: nextValues, paramIndex: paramIndex + 1 };
};

const belongsToProject = async (employeeId, projectId) => {
  const pid = Number(projectId);
  const eid = Number(employeeId);
  if (!Number.isFinite(pid) || pid <= 0 || !Number.isFinite(eid) || eid <= 0) {
    return false;
  }

  const result = await query(
    `SELECT 1
     FROM ${TABLE} em
     WHERE em.id = $1
       AND ${employeeRoleHasProject('$2')}
     LIMIT 1`,
    [eid, pid]
  );
  return result.rowCount > 0;
};

const list = async (body, scopeProjectId = null) => {
  const { skip, limit } = parsePagination(body);
  const { field: sortField, order: sortOrder } = parseSort(
    body,
    SORT_FIELDS,
    'created_at'
  );
  const sortColumn =
    FILTER_COLUMN_MAP[sortField] || `em."${sortField}"`;
  let { whereSql, values, paramIndex: whereParamIndex } =
    buildJoinedWhereClause(body.filters);

  ({ whereSql, values, paramIndex: whereParamIndex } = appendProjectScope(
    scopeProjectId,
    whereSql,
    values,
    whereParamIndex
  ));

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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE em.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByLoginId = async (loginId) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE em.emp_login_id = $1`,
    [loginId]
  );
  return result.rows[0] || null;
};

const findByEmpCodeOrEmail = async (identifier) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL}
     WHERE lower(em.emp_code) = lower($1)
        OR (em.email IS NOT NULL AND lower(em.email) = lower($1))
     LIMIT 1`,
    [identifier]
  );
  return result.rows[0] || null;
};

const existsByEmpCode = async (empCode, excludeId = null) => {
  const result = await query(
    `SELECT 1 FROM ${TABLE}
     WHERE lower(emp_code) = lower($1)
       AND ($2::int IS NULL OR id <> $2)
     LIMIT 1`,
    [empCode, excludeId]
  );
  return result.rowCount > 0;
};

const update = async (id, payload) => {
  const row = await repo.update(id, payload, ['updated_at = NOW()']);
  return row;
};

module.exports = {
  ...repo,
  list,
  findById,
  findByLoginId,
  findByEmpCodeOrEmail,
  existsByEmpCode,
  belongsToProject,
  update,
};
