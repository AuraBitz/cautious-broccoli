const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'plans_tracker';

const FILTER_COLUMN_MAP = {
  id: 'pt.id',
  client_login_id: 'pt.client_login_id',
  purchase_at: 'pt.purchase_at',
  plan_id: 'pt.plan_id',
  created_at: 'pt.created_at',
  client_name: 'rm.restaurant_name',
  username: 'cl.username',
  login_username: 'cl.username',
  plan_type: 'pm.plan_type',
  plan_amount: 'pm.amount',
  plan_validity: 'pm.plan_valid_days',
  project_id: 'cm.project_id',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const LIST_SELECT_SQL = `
  pt.id,
  pt.client_login_id,
  pt.purchase_at,
  pt.plan_id,
  COALESCE(NULLIF(trim(rm.restaurant_name), ''), cm.owner_name) AS client_name,
  cl.username,
  pm.plan_type,
  pm.amount AS plan_amount,
  pm.plan_valid_days AS plan_validity
`;

const FROM_JOIN_SQL = `
  FROM ${TABLE} pt
  LEFT JOIN client_login_master cl ON cl.id = pt.client_login_id
  LEFT JOIN plans_master pm ON pm.id = pt.plan_id
  LEFT JOIN client_management cm ON cm.login_id = pt.client_login_id
  LEFT JOIN restaurant_master rm ON rm.id = cm.restaurant_id
`;

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `pt."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const list = async (body = {}) => {
  const { skip, limit } = parsePagination(body);
  const { field: sortField, order: sortOrder } = parseSort(
    body,
    SORT_FIELDS,
    'purchase_at'
  );
  const sortColumn =
    FILTER_COLUMN_MAP[sortField] || `pt."${sortField}"`;
  const { whereSql, values, paramIndex: whereParamIndex } =
    buildJoinedWhereClause(body.filters, {
      purchase_at: 'date',
    });

  let paramIndex = whereParamIndex;
  const orderSql = `ORDER BY ${sortColumn} ${sortOrder}`;
  const limitSql = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const listValues = [...values, limit, skip];

  const listQuery = `
    SELECT ${LIST_SELECT_SQL}
    ${FROM_JOIN_SQL}
    ${whereSql}
    ${orderSql}
    ${limitSql}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    ${FROM_JOIN_SQL}
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

const create = async ({ client_login_id, plan_id, purchase_at }) => {
  const result = await query(
    `INSERT INTO ${TABLE} (client_login_id, plan_id, purchase_at)
     VALUES ($1, $2, $3)
     RETURNING id, client_login_id, purchase_at, plan_id, created_at`,
    [client_login_id, plan_id, purchase_at]
  );
  return result.rows[0];
};

const findLatestByLoginId = async (clientLoginId) => {
  const result = await query(
    `SELECT id, client_login_id, purchase_at, plan_id, created_at
     FROM ${TABLE}
     WHERE client_login_id = $1
     ORDER BY purchase_at DESC, id DESC
     LIMIT 1`,
    [clientLoginId]
  );
  return result.rows[0] || null;
};

const findLatestByLoginIds = async (loginIds = []) => {
  if (!loginIds.length) return [];
  const result = await query(
    `SELECT DISTINCT ON (client_login_id)
       id, client_login_id, purchase_at, plan_id, created_at
     FROM ${TABLE}
     WHERE client_login_id = ANY($1::int[])
     ORDER BY client_login_id, purchase_at DESC, id DESC`,
    [loginIds]
  );
  return result.rows;
};

module.exports = {
  list,
  create,
  findLatestByLoginId,
  findLatestByLoginIds,
};
