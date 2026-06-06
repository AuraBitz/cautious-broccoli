const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_menu_master';

const COLUMNS = [
  'id',
  'restaurant_id',
  'restaurant_thali_name',
  'thali_image',
  'menu_items',
  'created_at',
];

const LIST_SELECT = `
  rmm.id,
  rmm.restaurant_id,
  rmm.restaurant_thali_name,
  rmm.thali_image,
  rmm.menu_items,
  rmm.created_at,
  rm.restaurant_name
`;

const FROM_SQL = `
  FROM ${TABLE} rmm
  LEFT JOIN restaurant_master rm ON rm.id = rmm.restaurant_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rmm.id',
  restaurant_id: 'rmm.restaurant_id',
  restaurant_thali_name: 'rmm.restaurant_thali_name',
  thali_image: 'rmm.thali_image',
  created_at: 'rmm.created_at',
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
        (_, field) => FILTER_COLUMN_MAP[field] || `rmm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: [
    'restaurant_id',
    'restaurant_thali_name',
    'thali_image',
    'menu_items',
  ],
  updatableColumns: ['restaurant_thali_name', 'thali_image', 'menu_items'],
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rmm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rmm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

/** pg treats JS arrays as PostgreSQL arrays — JSONB needs explicit cast. */
const toJsonbParam = (value) => JSON.stringify(value ?? []);

const create = async (payload) => {
  const result = await query(
    `INSERT INTO ${TABLE} (restaurant_id, restaurant_thali_name, thali_image, menu_items)
     VALUES ($1, $2, $3, $4::jsonb)
     RETURNING ${COLUMNS.join(', ')}`,
    [
      payload.restaurant_id,
      payload.restaurant_thali_name,
      payload.thali_image ?? null,
      toJsonbParam(payload.menu_items),
    ]
  );
  return result.rows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  let idx = 1;

  if (payload.restaurant_thali_name !== undefined) {
    fields.push(`restaurant_thali_name = $${idx++}`);
    values.push(payload.restaurant_thali_name);
  }
  if (payload.thali_image !== undefined) {
    fields.push(`thali_image = $${idx++}`);
    values.push(payload.thali_image);
  }
  if (payload.menu_items !== undefined) {
    fields.push(`menu_items = $${idx++}::jsonb`);
    values.push(toJsonbParam(payload.menu_items));
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
