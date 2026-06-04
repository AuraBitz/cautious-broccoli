const { query } = require('../connectivity/postgres');
const {
  parsePagination,
  parseSort,
  buildWhereClause,
} = require('../utils/list-query-builder');

const TABLE = 'client_management';
const SELECT_COLUMNS = [
  'id',
  'company_name',
  'owner_name',
  'mobile',
  'email',
  'address',
  'city',
  'state',
  'country',
  'plan_id',
  'applied_at',
  'created_at',
  'project_id',
  'plan_start_at',
  'plan_remain_days',
  'plan_status',
  'login_id',
];

const LIST_SELECT_SQL = `
  cm.id,
  cm.company_name,
  cm.owner_name,
  cm.mobile,
  cm.email,
  cm.address,
  cm.city,
  cm.state,
  cm.country,
  cm.plan_id,
  cm.applied_at,
  cm.created_at,
  cm.project_id,
  cm.plan_start_at,
  cm.plan_remain_days,
  cm.plan_status,
  cm.login_id,
  pm.name AS project_name,
  pl.plan_type AS plan_type,
  pl.amount AS plan_amount
`;

const FROM_JOIN_SQL = `
  FROM client_management cm
  LEFT JOIN project_master pm ON pm.id = cm.project_id
  LEFT JOIN plans_master pl ON pl.id = cm.plan_id
`;

const FILTER_COLUMN_MAP = {
  id: 'cm.id',
  company_name: 'cm.company_name',
  owner_name: 'cm.owner_name',
  mobile: 'cm.mobile',
  email: 'cm.email',
  address: 'cm.address',
  city: 'cm.city',
  state: 'cm.state',
  country: 'cm.country',
  plan_id: 'cm.plan_id',
  applied_at: 'cm.applied_at',
  created_at: 'cm.created_at',
  project_id: 'cm.project_id',
  plan_start_at: 'cm.plan_start_at',
  plan_remain_days: 'cm.plan_remain_days',
  plan_status: 'cm.plan_status',
  login_id: 'cm.login_id',
  project_name: 'pm.name',
  plan_type: 'pl.plan_type',
  plan_amount: 'pl.amount',
};

const FILTER_FIELDS = Object.keys(FILTER_COLUMN_MAP);
const SORT_FIELDS = [...FILTER_FIELDS];

const buildJoinedWhereClause = (filters = {}, fieldTypes = {}) => {
  const base = buildWhereClause(filters, FILTER_FIELDS, fieldTypes);
  const whereSql = base.whereSql
    ? base.whereSql.replace(
        /"([^"]+)"/g,
        (_, field) => FILTER_COLUMN_MAP[field] || `cm."${field}"`
      )
    : '';
  return { ...base, whereSql };
};

const list = async (body) => {
  const { skip, limit } = parsePagination(body);
  const { field: sortField, order: sortOrder } = parseSort(
    body,
    SORT_FIELDS,
    'created_at'
  );
  const sortColumn =
    FILTER_COLUMN_MAP[sortField] || `cm."${sortField}"`;
  const { whereSql, values, paramIndex: whereParamIndex } =
    buildJoinedWhereClause(body.filters);

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

const findById = async (id) => {
  const result = await query(
    `SELECT ${LIST_SELECT_SQL}
     ${FROM_JOIN_SQL}
     WHERE cm.id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (payload) => {
  const result = await query(
    `INSERT INTO ${TABLE} (
      company_name, owner_name, mobile, email, address, city, state, country,
      plan_id, applied_at, project_id, plan_start_at, plan_remain_days,
      plan_status, login_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    ) RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [
      payload.company_name,
      payload.owner_name,
      payload.mobile || null,
      payload.email || null,
      payload.address || null,
      payload.city || null,
      payload.state || null,
      payload.country || null,
      payload.plan_id ?? null,
      payload.applied_at || null,
      payload.project_id ?? null,
      payload.plan_start_at || null,
      payload.plan_remain_days ?? null,
      payload.plan_status || 'Active',
      payload.login_id ?? null,
    ]
  );
  return result.rows[0];
};

const update = async (id, payload) => {
  const allowed = [
    'company_name',
    'owner_name',
    'mobile',
    'email',
    'address',
    'city',
    'state',
    'country',
    'plan_id',
    'applied_at',
    'project_id',
    'plan_start_at',
    'plan_remain_days',
    'plan_status',
    'login_id',
  ];

  const fields = [];
  const values = [];
  let idx = 1;

  allowed.forEach((key) => {
    if (payload[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(payload[key]);
    }
  });

  if (!fields.length) return findById(id);

  values.push(id);
  const result = await query(
    `UPDATE ${TABLE} SET ${fields.join(', ')} WHERE id = $${idx}
     RETURNING ${SELECT_COLUMNS.join(', ')}`,
    values
  );
  return result.rows[0] || null;
};

const remove = async (id) => {
  const result = await query(
    `DELETE FROM ${TABLE} WHERE id = $1 RETURNING id`,
    [id]
  );
  return result.rows[0] || null;
};

const findByLoginId = async (loginId) => {
  const result = await query(
    `SELECT ${SELECT_COLUMNS.join(', ')} FROM ${TABLE} WHERE login_id = $1 LIMIT 1`,
    [loginId]
  );
  return result.rows[0] || null;
};

const updatePlanFields = async (id, { plan_remain_days, plan_status }) => {
  const result = await query(
    `UPDATE ${TABLE}
     SET plan_remain_days = $1, plan_status = $2
     WHERE id = $3
     RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [plan_remain_days, plan_status, id]
  );
  return result.rows[0] || null;
};

module.exports = {
  list,
  findById,
  findByLoginId,
  create,
  update,
  updatePlanFields,
  remove,
};
