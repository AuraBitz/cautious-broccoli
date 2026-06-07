const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_customer_management';

const COLUMNS = [
  'id',
  'restaurant_id',
  'customer_name',
  'email',
  'phone',
  'customer_login_id',
  'is_not_login',
  'current_status',
  'address',
  'created_at',
];

const LIST_SELECT = `
  rcm.id,
  rcm.restaurant_id,
  rcm.customer_name,
  rcm.email,
  rcm.phone,
  rcm.customer_login_id,
  rcm.is_not_login,
  rcm.current_status,
  rcm.address,
  rcm.created_at,
  rm.restaurant_name
`;

const FROM_SQL = `
  FROM ${TABLE} rcm
  LEFT JOIN restaurant_master rm ON rm.id = rcm.restaurant_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rcm.id',
  restaurant_id: 'rcm.restaurant_id',
  customer_name: 'rcm.customer_name',
  email: 'rcm.email',
  phone: 'rcm.phone',
  customer_login_id: 'rcm.customer_login_id',
  is_not_login: 'rcm.is_not_login',
  current_status: 'rcm.current_status',
  address: 'rcm.address',
  created_at: 'rcm.created_at',
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
        (_, field) => FILTER_COLUMN_MAP[field] || `rcm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'restaurant_id',
    'customer_name',
    'email',
    'phone',
    'customer_login_id',
    'is_not_login',
    'current_status',
    'address',
  ],
  updatableColumns: [
    'customer_name',
    'email',
    'phone',
    'customer_login_id',
    'is_not_login',
    'current_status',
    'address',
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rcm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rcm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByRestaurantAndPhone = async (restaurantId, phone) => {
  if (!phone) return null;
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL}
     WHERE rcm.restaurant_id = $1 AND rcm.phone = $2
     LIMIT 1`,
    [restaurantId, phone]
  );
  return result.rows[0] || null;
};

module.exports = { ...repo, list, findById, findByRestaurantAndPhone };
