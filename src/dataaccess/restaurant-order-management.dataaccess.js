const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_order_management';

const COLUMNS = [
  'id',
  'table_id',
  'restaurant_id',
  'menu_id',
  'item_id',
  'amount',
  'status',
  'customer_transaction_id',
  'created_at',
];

const LIST_SELECT = `
  rom.id,
  rom.table_id,
  rom.restaurant_id,
  rom.menu_id,
  rom.item_id,
  rom.amount,
  rom.status,
  rom.customer_transaction_id,
  rom.created_at,
  rm.restaurant_name,
  rtm.table_number
`;

const FROM_SQL = `
  FROM ${TABLE} rom
  LEFT JOIN restaurant_master rm ON rm.id = rom.restaurant_id
  LEFT JOIN restaurant_table_master rtm ON rtm.id = rom.table_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rom.id',
  table_id: 'rom.table_id',
  restaurant_id: 'rom.restaurant_id',
  amount: 'rom.amount',
  status: 'rom.status',
  customer_transaction_id: 'rom.customer_transaction_id',
  created_at: 'rom.created_at',
  restaurant_name: 'rm.restaurant_name',
  table_number: 'rtm.table_number',
  project_id: 'rm.project_id',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `rom."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const normalizeIntArray = (value) => {
  if (value == null) return [];
  if (Array.isArray(value)) {
    return value.map((v) => Number(v)).filter((n) => Number.isInteger(n) && n > 0);
  }
  return [];
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'table_id',
    'restaurant_id',
    'menu_id',
    'item_id',
    'amount',
    'status',
    'customer_transaction_id',
  ],
  updatableColumns: [
    'table_id',
    'menu_id',
    'item_id',
    'amount',
    'status',
    'customer_transaction_id',
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rom."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rom.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (payload) => {
  const result = await query(
    `INSERT INTO ${TABLE}
      (table_id, restaurant_id, menu_id, item_id, amount, status, customer_transaction_id)
     VALUES ($1, $2, $3::integer[], $4::integer[], $5, $6, $7)
     RETURNING ${COLUMNS.join(', ')}`,
    [
      payload.table_id ?? null,
      payload.restaurant_id,
      normalizeIntArray(payload.menu_id),
      normalizeIntArray(payload.item_id),
      payload.amount ?? 0,
      payload.status ?? 'pending',
      payload.customer_transaction_id ?? null,
    ]
  );
  return result.rows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (payload.table_id !== undefined) {
    fields.push(`table_id = $${idx++}`);
    values.push(payload.table_id);
  }
  if (payload.menu_id !== undefined) {
    fields.push(`menu_id = $${idx++}::integer[]`);
    values.push(normalizeIntArray(payload.menu_id));
  }
  if (payload.item_id !== undefined) {
    fields.push(`item_id = $${idx++}::integer[]`);
    values.push(normalizeIntArray(payload.item_id));
  }
  if (payload.amount !== undefined) {
    fields.push(`amount = $${idx++}`);
    values.push(payload.amount);
  }
  if (payload.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(payload.status);
  }
  if (payload.customer_transaction_id !== undefined) {
    fields.push(`customer_transaction_id = $${idx++}`);
    values.push(payload.customer_transaction_id);
  }

  if (!fields.length) return findById(id);

  values.push(id);
  const result = await query(
    `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING ${COLUMNS.join(', ')}`,
    values
  );
  return result.rows[0] || null;
};

module.exports = { ...repo, list, findById, create, update };
