const createCrudRepository = require('./crud-repository');
const { query, getPool, connect } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_order_master';

const COLUMNS = [
  'id',
  'order_number',
  'customer_id',
  'floor_id',
  'table_id',
  'restaurant_id',
  'order_items_id',
  'status',
  'created_at',
];

const LIST_SELECT = `
  rom.id,
  rom.order_number,
  rom.customer_id,
  rom.floor_id,
  rom.table_id,
  rom.restaurant_id,
  rom.order_items_id,
  rom.status,
  rom.created_at,
  rm.restaurant_name,
  rcm.customer_name,
  rfm.floor_no,
  rtm.table_number
`;

const FROM_SQL = `
  FROM ${TABLE} rom
  LEFT JOIN restaurant_master rm ON rm.id = rom.restaurant_id
  LEFT JOIN restaurant_customer_management rcm ON rcm.id = rom.customer_id
  LEFT JOIN restaurant_floor_master rfm ON rfm.id = rom.floor_id
  LEFT JOIN restaurant_table_master rtm ON rtm.id = rom.table_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rom.id',
  order_number: 'rom.order_number',
  customer_id: 'rom.customer_id',
  floor_id: 'rom.floor_id',
  table_id: 'rom.table_id',
  restaurant_id: 'rom.restaurant_id',
  status: 'rom.status',
  created_at: 'rom.created_at',
  restaurant_name: 'rm.restaurant_name',
  customer_name: 'rcm.customer_name',
  floor_no: 'rfm.floor_no',
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

const nextOrderNumber = async (restaurantId) => {
  const { rows } = await query(
    `SELECT COALESCE(MAX(order_number), 0) + 1 AS next_number
     FROM ${TABLE}
     WHERE restaurant_id = $1`,
    [restaurantId]
  );
  return Number(rows[0]?.next_number ?? 1);
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [],
  updatableColumns: [
    'customer_id',
    'floor_id',
    'table_id',
    'order_items_id',
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
  const orderNumber = await nextOrderNumber(payload.restaurant_id);
  const result = await query(
    `INSERT INTO ${TABLE}
      (order_number, customer_id, floor_id, table_id, restaurant_id, order_items_id, status)
     VALUES ($1, $2, $3, $4, $5, $6::integer[], $7)
     RETURNING ${COLUMNS.join(', ')}`,
    [
      orderNumber,
      payload.customer_id ?? null,
      payload.floor_id ?? null,
      payload.table_id ?? null,
      payload.restaurant_id,
      normalizeIntArray(payload.order_items_id),
      payload.status ?? 'pending',
    ]
  );
  return result.rows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (payload.customer_id !== undefined) {
    fields.push(`customer_id = $${idx++}`);
    values.push(payload.customer_id);
  }
  if (payload.floor_id !== undefined) {
    fields.push(`floor_id = $${idx++}`);
    values.push(payload.floor_id);
  }
  if (payload.table_id !== undefined) {
    fields.push(`table_id = $${idx++}`);
    values.push(payload.table_id);
  }
  if (payload.order_items_id !== undefined) {
    fields.push(`order_items_id = $${idx++}::integer[]`);
    values.push(normalizeIntArray(payload.order_items_id));
  }
  if (payload.status !== undefined) {
    fields.push(`status = $${idx++}`);
    values.push(payload.status);
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

const findActiveOrder = async ({ restaurant_id, table_id, customer_id }) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL}
     WHERE rom.restaurant_id = $1
       AND rom.table_id = $2
       AND rom.status IN ('pending', 'on_dine')
     ORDER BY
       CASE WHEN rom.customer_id IS NOT DISTINCT FROM $3 THEN 0 ELSE 1 END,
       rom.created_at DESC
     LIMIT 1`,
    [restaurant_id, table_id, customer_id ?? null]
  );
  return result.rows[0] || null;
};

const advisoryLockKey = (restaurantId, tableId) => {
  const key = `${restaurantId}:${tableId}`;
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
};

const ensureActiveOrder = async (payload) => {
  await connect();
  const pool = getPool();
  const client = await pool.connect();

  const restaurantId = Number(payload.restaurant_id);
  const tableId = Number(payload.table_id);
  const floorId = payload.floor_id != null ? Number(payload.floor_id) : null;
  const customerId = payload.customer_id != null ? Number(payload.customer_id) : null;

  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock($1)', [
      advisoryLockKey(restaurantId, tableId),
    ]);

    const existingResult = await client.query(
      `SELECT ${LIST_SELECT} ${FROM_SQL}
       WHERE rom.restaurant_id = $1
         AND rom.table_id = $2
         AND rom.status IN ('pending', 'on_dine')
       ORDER BY
         CASE WHEN rom.customer_id IS NOT DISTINCT FROM $3 THEN 0 ELSE 1 END,
         rom.created_at DESC
       LIMIT 1`,
      [restaurantId, tableId, customerId]
    );

    if (existingResult.rows[0]) {
      const existing = existingResult.rows[0];
      if (customerId != null && existing.customer_id == null) {
        await client.query(
          `UPDATE ${TABLE} SET customer_id = $1 WHERE id = $2`,
          [customerId, existing.id]
        );
        await client.query('COMMIT');
        return findById(existing.id);
      }
      await client.query('COMMIT');
      return existing;
    }

    const nextNumberResult = await client.query(
      `SELECT COALESCE(MAX(order_number), 0) + 1 AS next_number
       FROM ${TABLE}
       WHERE restaurant_id = $1`,
      [restaurantId]
    );
    const orderNumber = Number(nextNumberResult.rows[0]?.next_number ?? 1);

    const insertResult = await client.query(
      `INSERT INTO ${TABLE}
        (order_number, customer_id, floor_id, table_id, restaurant_id, order_items_id, status)
       VALUES ($1, $2, $3, $4, $5, $6::integer[], $7)
       RETURNING ${COLUMNS.join(', ')}`,
      [
        orderNumber,
        customerId,
        floorId,
        tableId,
        restaurantId,
        normalizeIntArray(payload.order_items_id),
        payload.status ?? 'pending',
      ]
    );

    await client.query('COMMIT');
    const created = insertResult.rows[0];
    return findById(created.id);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  ...repo,
  list,
  findById,
  create,
  update,
  nextOrderNumber,
  findActiveOrder,
  ensureActiveOrder,
};
