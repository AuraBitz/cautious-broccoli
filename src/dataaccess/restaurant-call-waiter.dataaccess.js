const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_call_waiter';

const COLUMNS = [
  'id',
  'restaurant_id',
  'floor_id',
  'table_id',
  'is_ring',
  'ring_count',
  'calling_text',
  'created_at',
  'updated_at',
];

const LIST_SELECT = `
  rcw.id,
  rcw.restaurant_id,
  rcw.floor_id,
  rcw.table_id,
  rcw.is_ring,
  rcw.ring_count,
  rcw.calling_text,
  rcw.created_at,
  rcw.updated_at,
  rm.restaurant_name,
  rfm.floor_no,
  rtm.table_number
`;

const FROM_SQL = `
  FROM ${TABLE} rcw
  LEFT JOIN restaurant_master rm ON rm.id = rcw.restaurant_id
  LEFT JOIN restaurant_floor_master rfm ON rfm.id = rcw.floor_id
  LEFT JOIN restaurant_table_master rtm ON rtm.id = rcw.table_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rcw.id',
  restaurant_id: 'rcw.restaurant_id',
  floor_id: 'rcw.floor_id',
  table_id: 'rcw.table_id',
  is_ring: 'rcw.is_ring',
  ring_count: 'rcw.ring_count',
  calling_text: 'rcw.calling_text',
  created_at: 'rcw.created_at',
  updated_at: 'rcw.updated_at',
  restaurant_name: 'rm.restaurant_name',
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
        (_, field) => FILTER_COLUMN_MAP[field] || `rcw."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const parseCallingText = (value) => {
  if (!value) return {};
  if (typeof value === 'object' && !Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'object' && parsed && !Array.isArray(parsed)
        ? parsed
        : {};
    } catch {
      return value.trim() ? { 1: value.trim() } : {};
    }
  }
  return {};
};

const nextMessageIndex = (callingText) => {
  const keys = Object.keys(callingText)
    .map((key) => Number(key))
    .filter((num) => Number.isFinite(num) && num > 0);
  if (!keys.length) return 1;
  return Math.max(...keys) + 1;
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'restaurant_id',
    'floor_id',
    'table_id',
    'is_ring',
    'ring_count',
    'calling_text',
  ],
  updatableColumns: ['is_ring', 'ring_count', 'calling_text', 'floor_id'],
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rcw."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rcw.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const findByRestaurantAndTable = async (restaurantId, tableId) => {
  const result = await query(
    `SELECT ${LIST_SELECT} ${FROM_SQL}
     WHERE rcw.restaurant_id = $1 AND rcw.table_id = $2
     LIMIT 1`,
    [restaurantId, tableId]
  );
  return result.rows[0] || null;
};

const upsertByTable = async ({
  restaurant_id,
  floor_id,
  table_id,
  is_ring,
  message_text,
}) => {
  const existing = await findByRestaurantAndTable(restaurant_id, table_id);

  if (existing) {
    if (is_ring) {
      await query(
        `
          UPDATE ${TABLE}
          SET ring_count = ring_count + 1,
              is_ring = TRUE,
              floor_id = $2,
              updated_at = NOW()
          WHERE id = $1
        `,
        [existing.id, floor_id]
      );
    } else {
      const callingText = parseCallingText(existing.calling_text);
      const nextIndex = nextMessageIndex(callingText);
      callingText[String(nextIndex)] = message_text;
      await query(
        `
          UPDATE ${TABLE}
          SET calling_text = $2::jsonb,
              is_ring = FALSE,
              floor_id = $3,
              updated_at = NOW()
          WHERE id = $1
        `,
        [existing.id, JSON.stringify(callingText), floor_id]
      );
    }
    return findById(existing.id);
  }

  if (is_ring) {
    const result = await query(
      `
        INSERT INTO ${TABLE} (
          restaurant_id, floor_id, table_id, is_ring, ring_count, calling_text, updated_at
        )
        VALUES ($1, $2, $3, TRUE, 1, '{}'::jsonb, NOW())
        RETURNING id
      `,
      [restaurant_id, floor_id, table_id]
    );
    return findById(result.rows[0].id);
  }

  const callingText = { 1: message_text };
  const result = await query(
    `
      INSERT INTO ${TABLE} (
        restaurant_id, floor_id, table_id, is_ring, ring_count, calling_text, updated_at
      )
      VALUES ($1, $2, $3, FALSE, 0, $4::jsonb, NOW())
      RETURNING id
    `,
    [restaurant_id, floor_id, table_id, JSON.stringify(callingText)]
  );
  return findById(result.rows[0].id);
};

const listRecentByRestaurant = async (restaurantId, minutes = 30) => {
  const result = await query(
    `
      SELECT ${LIST_SELECT}
      ${FROM_SQL}
      WHERE rcw.restaurant_id = $1
        AND rcw.updated_at >= NOW() - ($2::int * INTERVAL '1 minute')
        AND (
          rcw.ring_count > 0
          OR rcw.calling_text <> '{}'::jsonb
        )
      ORDER BY rcw.updated_at DESC
      LIMIT 50
    `,
    [restaurantId, minutes]
  );
  return result.rows;
};

module.exports = {
  ...repo,
  list,
  findById,
  findByRestaurantAndTable,
  upsertByTable,
  listRecentByRestaurant,
};
