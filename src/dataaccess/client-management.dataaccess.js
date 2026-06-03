const { query } = require('../connectivity/postgres');
const { buildListQuery } = require('../utils/list-query-builder');

const TABLE = 'client_management';
const SELECT_COLUMNS = [
  'id',
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

const FILTER_FIELDS = [...SELECT_COLUMNS];
const SORT_FIELDS = [...SELECT_COLUMNS];

const list = async (body) => {
  const built = buildListQuery({
    table: TABLE,
    selectColumns: SELECT_COLUMNS,
    allowedFilterFields: FILTER_FIELDS,
    allowedSortFields: SORT_FIELDS,
    defaultSortField: 'created_at',
    body,
  });

  const [rowsResult, countResult] = await Promise.all([
    query(built.listQuery, built.listValues),
    query(built.countQuery, built.countValues),
  ]);

  return {
    rows: rowsResult.rows,
    total: countResult.rows[0].total,
    skip: built.skip,
    limit: built.limit,
    sort: built.sort,
  };
};

const findById = async (id) => {
  const result = await query(
    `SELECT ${SELECT_COLUMNS.join(', ')} FROM ${TABLE} WHERE id = $1`,
    [id]
  );
  return result.rows[0] || null;
};

const create = async (payload) => {
  const result = await query(
    `INSERT INTO ${TABLE} (
      owner_name, mobile, email, address, city, state, country,
      plan_id, applied_at, project_id, plan_start_at, plan_remain_days,
      plan_status, login_id
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    ) RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [
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
