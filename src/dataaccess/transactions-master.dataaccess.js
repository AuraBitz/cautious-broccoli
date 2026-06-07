const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'transactions_master';

const COLUMNS = [
  'id',
  'payment_type_id',
  'account',
  'project_id',
  'number',
  'transaction_no',
  'customer_id',
  'transaction_date',
  'plan_id',
  'created_at',
];

const LIST_SELECT = `
  tm.id,
  tm.payment_type_id,
  pt.type AS payment_type,
  tm.account,
  tm.project_id,
  pm.name AS project_name,
  tm.number,
  tm.transaction_no,
  tm.customer_id,
  COALESCE(NULLIF(TRIM(cm.owner_name), ''), NULLIF(TRIM(rm.restaurant_name), '')) AS customer_name,
  tm.transaction_date,
  tm.plan_id,
  pl.plan_type,
  tm.created_at
`;

const FROM_SQL = `
  FROM ${TABLE} tm
  LEFT JOIN payment_type_master pt ON pt.id = tm.payment_type_id
  LEFT JOIN project_master pm ON pm.id = tm.project_id
  LEFT JOIN client_management cm ON cm.id = tm.customer_id
  LEFT JOIN restaurant_master rm ON rm.id = cm.restaurant_id
  LEFT JOIN plans_master pl ON pl.id = tm.plan_id
`;

const FILTER_COLUMN_MAP = {
  id: 'tm.id',
  payment_type_id: 'tm.payment_type_id',
  payment_type: 'pt.type',
  account: 'tm.account',
  project_id: 'tm.project_id',
  project_name: 'pm.name',
  number: 'tm.number',
  transaction_no: 'tm.transaction_no',
  customer_id: 'tm.customer_id',
  customer_name: "COALESCE(NULLIF(TRIM(cm.owner_name), ''), NULLIF(TRIM(rm.restaurant_name), ''))",
  transaction_date: 'tm.transaction_date',
  plan_id: 'tm.plan_id',
  plan_type: 'pl.plan_type',
  created_at: 'tm.created_at',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `tm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'payment_type_id',
    'account',
    'project_id',
    'number',
    'transaction_no',
    'customer_id',
    'transaction_date',
    'plan_id',
  ],
  updatableColumns: [
    'payment_type_id',
    'account',
    'project_id',
    'number',
    'transaction_no',
    'customer_id',
    'transaction_date',
    'plan_id',
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `tm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE tm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = {
  ...repo,
  list,
  findById,
};
