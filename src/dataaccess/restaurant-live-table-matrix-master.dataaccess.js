const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_live_table_matrix_master';

const COLUMNS = ['id', 'restaurant_id', 'matrix', 'created_at', 'updated_at'];

const LIST_SELECT = `
  rltmm.id,
  rltmm.restaurant_id,
  rltmm.matrix,
  rltmm.created_at,
  rltmm.updated_at,
  rm.restaurant_name
`;

const FROM_SQL = `
  FROM ${TABLE} rltmm
  LEFT JOIN restaurant_master rm ON rm.id = rltmm.restaurant_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rltmm.id',
  restaurant_id: 'rltmm.restaurant_id',
  created_at: 'rltmm.created_at',
  updated_at: 'rltmm.updated_at',
  restaurant_name: 'rm.restaurant_name',
  project_id: 'rm.project_id',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `rltmm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: ['restaurant_id', 'matrix'],
  updatableColumns: ['matrix'],
  defaultSortField: 'updated_at',
  filterFields: FILTER_FIELDS,
  sortFields: SORT_FIELDS,
});

const list = async (body) => {
  const { skip, limit } = parsePagination(body);
  const { field: sortField, order: sortOrder } = parseSort(
    body,
    SORT_FIELDS,
    'updated_at'
  );
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rltmm."${sortField}"`;
  const { whereSql, values, paramIndex: whereParamIndex } =
    buildJoinedWhereClause(body.filters);

  let paramIndex = whereParamIndex;
  const orderSql = `ORDER BY ${sortColumn} ${sortOrder}`;
  const limitSql = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const listValues = [...values, limit, skip];

  const [rowsResult, countResult] = await Promise.all([
    query(
      `SELECT ${LIST_SELECT} ${FROM_SQL} ${whereSql} ${orderSql} ${limitSql}`,
      listValues
    ),
    query(`SELECT COUNT(*)::int AS total ${FROM_SQL} ${whereSql}`, values),
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rltmm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByRestaurantId = async (restaurantId) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rltmm.restaurant_id = $1`,
    [restaurantId]
  );
  return result.rows[0] || null;
};

const upsertByRestaurantId = async (restaurantId, matrix) => {
  const result = await query(
    `INSERT INTO ${TABLE} (restaurant_id, matrix)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (restaurant_id)
     DO UPDATE SET
       matrix = EXCLUDED.matrix,
       updated_at = NOW()
     RETURNING id, restaurant_id, matrix, created_at, updated_at`,
    [restaurantId, JSON.stringify(matrix ?? {})]
  );
  return result.rows[0];
};

module.exports = {
  ...repo,
  list,
  findById,
  findByRestaurantId,
  upsertByRestaurantId,
};
