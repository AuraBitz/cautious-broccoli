const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_payment_master';

const COLUMNS = [
  'id',
  'order_id',
  'transaction_id',
  'is_cash_amount',
  'amount',
  'payment_at',
  'created_at',
];

const LIST_SELECT = `
  rpm.id,
  rpm.order_id,
  rpm.transaction_id,
  rpm.is_cash_amount,
  rpm.amount,
  rpm.payment_at,
  rpm.created_at,
  rom.restaurant_id,
  rm.restaurant_name
`;

const FROM_SQL = `
  FROM ${TABLE} rpm
  LEFT JOIN restaurant_order_management rom ON rom.id = rpm.order_id
  LEFT JOIN restaurant_master rm ON rm.id = rom.restaurant_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rpm.id',
  order_id: 'rpm.order_id',
  transaction_id: 'rpm.transaction_id',
  is_cash_amount: 'rpm.is_cash_amount',
  amount: 'rpm.amount',
  payment_at: 'rpm.payment_at',
  created_at: 'rpm.created_at',
  restaurant_id: 'rom.restaurant_id',
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
        (_, field) => FILTER_COLUMN_MAP[field] || `rpm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'order_id',
    'transaction_id',
    'is_cash_amount',
    'amount',
    'payment_at',
  ],
  updatableColumns: [
    'transaction_id',
    'is_cash_amount',
    'amount',
    'payment_at',
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rpm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rpm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { ...repo, list, findById };
