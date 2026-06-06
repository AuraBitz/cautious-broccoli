const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'project_permission_master';

const COLUMNS = [
  'id',
  'role_ids',
  'project_ids',
  'overall_access',
  'created_at',
];

const LIST_SELECT = `
  ppm.id,
  ppm.role_ids,
  (
    SELECT COALESCE(
      string_agg(prm.role_name || ' (' || prm.code || ')', ', ' ORDER BY prm.role_name),
      ''
    )
    FROM project_role_master prm
    WHERE prm.id = ANY (ppm.role_ids)
  ) AS role_names,
  ppm.project_ids,
  ppm.overall_access,
  ppm.created_at
`;

const FROM_SQL = `FROM ${TABLE} ppm`;

const FILTER_COLUMN_MAP = {
  id: 'ppm.id',
  overall_access: 'ppm.overall_access',
  created_at: 'ppm.created_at',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = FILTER_FIELDS;

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `ppm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: ['role_ids', 'project_ids', 'overall_access'],
  updatableColumns: ['role_ids', 'project_ids', 'overall_access'],
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
    FILTER_COLUMN_MAP[sortField] || `ppm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE ppm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findAllByRoleId = async (roleId) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE $1 = ANY (ppm.role_ids)`,
    [roleId]
  );
  return result.rows;
};

const findRowsOverlappingRoleIds = async (roleIds = [], excludeId = null) => {
  if (!roleIds.length) return [];
  const result = await query(
    `SELECT id, role_ids
     FROM ${TABLE}
     WHERE role_ids && $1::int[]
       AND ($2::int IS NULL OR id <> $2)`,
    [roleIds, excludeId]
  );
  return result.rows;
};

module.exports = {
  ...repo,
  list,
  findById,
  findAllByRoleId,
  findRowsOverlappingRoleIds,
};
