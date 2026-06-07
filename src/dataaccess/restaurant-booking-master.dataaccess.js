const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_booking_master';

const COLUMNS = [
  'id',
  'customer_id',
  'restaurant_id',
  'customer_name',
  'customer_phone',
  'booking_time',
  'booking_date',
  'booking_status',
  'persons_count',
  'table_id',
  'is_manual_booking',
  'created_at',
];

const LIST_SELECT = `
  rbm.id,
  rbm.customer_id,
  rbm.restaurant_id,
  COALESCE(rbm.customer_name, rcm.customer_name) AS customer_name,
  COALESCE(rbm.customer_phone, rcm.phone) AS customer_phone,
  rbm.booking_time,
  rbm.booking_date,
  rbm.booking_status,
  rbm.persons_count,
  rbm.table_id,
  rbm.is_manual_booking,
  rbm.created_at,
  rm.restaurant_name,
  rtm.table_number,
  rtm.floor_id,
  rfm.floor_no
`;

const FROM_SQL = `
  FROM ${TABLE} rbm
  LEFT JOIN restaurant_master rm ON rm.id = rbm.restaurant_id
  LEFT JOIN restaurant_customer_management rcm ON rcm.id = rbm.customer_id
  LEFT JOIN restaurant_table_master rtm ON rtm.id = rbm.table_id
  LEFT JOIN restaurant_floor_master rfm ON rfm.id = rtm.floor_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rbm.id',
  customer_id: 'rbm.customer_id',
  restaurant_id: 'rbm.restaurant_id',
  customer_name: 'COALESCE(rbm.customer_name, rcm.customer_name)',
  customer_phone: 'COALESCE(rbm.customer_phone, rcm.phone)',
  booking_time: 'rbm.booking_time',
  booking_status: 'rbm.booking_status',
  booking_date: 'rbm.booking_date',
  persons_count: 'rbm.persons_count',
  table_id: 'rbm.table_id',
  is_manual_booking: 'rbm.is_manual_booking',
  created_at: 'rbm.created_at',
  restaurant_name: 'rm.restaurant_name',
  table_number: 'rtm.table_number',
  floor_id: 'rtm.floor_id',
  floor_no: 'rfm.floor_no',
  project_id: 'rm.project_id',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `rbm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'customer_id',
    'restaurant_id',
    'customer_name',
    'customer_phone',
    'booking_time',
    'booking_date',
    'booking_status',
    'persons_count',
    'table_id',
    'is_manual_booking',
  ],
  updatableColumns: [
    'customer_id',
    'customer_name',
    'customer_phone',
    'booking_time',
    'booking_date',
    'booking_status',
    'persons_count',
    'table_id',
    'is_manual_booking',
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rbm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rbm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const listActiveByRestaurantId = async (restaurantId) => {
  const result = await query(
    `SELECT
      rbm.table_id,
      rbm.booking_status,
      rtm.table_number,
      rtm.floor_id
    ${FROM_SQL}
    WHERE rbm.restaurant_id = $1
      AND rbm.booking_status IN ('pending', 'confirmed')
      AND (rbm.table_id IS NOT NULL OR rtm.table_number IS NOT NULL)`,
    [restaurantId]
  );
  return result.rows;
};

module.exports = { ...repo, list, findById, listActiveByRestaurantId };
