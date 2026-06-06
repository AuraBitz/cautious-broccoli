const createCrudRepository = require('./crud-repository');
const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'restaurant_floor_master';

const COLUMNS = ['id', 'restaurant_id', 'floor_no', 'created_at'];

const LIST_SELECT = `
  rfm.id,
  rfm.restaurant_id,
  rfm.floor_no,
  rfm.created_at,
  rm.restaurant_name
`;

const FROM_SQL = `
  FROM ${TABLE} rfm
  LEFT JOIN restaurant_master rm ON rm.id = rfm.restaurant_id
`;

const FILTER_COLUMN_MAP = {
  id: 'rfm.id',
  restaurant_id: 'rfm.restaurant_id',
  floor_no: 'rfm.floor_no',
  created_at: 'rfm.created_at',
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
        (_, field) => FILTER_COLUMN_MAP[field] || `rfm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const repo = createCrudRepository({
  table: TABLE,
  columns: COLUMNS,
  insertColumns: ['restaurant_id', 'floor_no'],
  updatableColumns: ['floor_no'],
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
  const sortColumn = FILTER_COLUMN_MAP[sortField] || `rfm."${sortField}"`;
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
    `SELECT ${LIST_SELECT} ${FROM_SQL} WHERE rfm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

module.exports = { ...repo, list, findById };
