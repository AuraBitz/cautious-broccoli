const { query } = require('../connectivity/postgres');
const { buildListQuery } = require('../utils/list-query-builder');

const TABLE = 'client_login_master';
const SELECT_COLUMNS = [
  'id',
  'username',
  'email',
  'role',
  'project_role_id',
  'created_at',
  'updated_at',
  'device_id',
  'status',
];

const FILTER_FIELDS = [
  'project_role_id',
  'id',
  'username',
  'email',
  'role',
  'status',
  'device_id',
  'created_at',
  'updated_at',
];

const SORT_FIELDS = [...FILTER_FIELDS];

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

const findByIdWithPassword = async (id) => {
  const result = await query(`SELECT * FROM ${TABLE} WHERE id = $1`, [id]);
  return result.rows[0] || null;
};

const findByUsernameOrEmail = async (identifier) => {
  const result = await query(
    `SELECT * FROM ${TABLE} WHERE username = $1 OR email = $1 LIMIT 1`,
    [identifier]
  );
  return result.rows[0] || null;
};

const create = async (payload) => {
  const result = await query(
    `INSERT INTO ${TABLE} (username, email, password, role, project_role_id, device_id, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [
      payload.username,
      payload.email,
      payload.password,
      payload.role || 'client',
      payload.project_role_id ?? null,
      payload.device_id || null,
      payload.status || 'active',
    ]
  );
  return result.rows[0];
};

const update = async (id, payload) => {
  const fields = [];
  const values = [];
  let idx = 1;

  const allowed = [
    'username',
    'email',
    'password',
    'role',
    'project_role_id',
    'device_id',
    'status',
  ];

  allowed.forEach((key) => {
    if (payload[key] !== undefined) {
      fields.push(`${key} = $${idx++}`);
      values.push(payload[key]);
    }
  });

  if (!fields.length) return findById(id);

  fields.push(`updated_at = NOW()`);
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

const existsById = async (id) => {
  const result = await query(`SELECT 1 FROM ${TABLE} WHERE id = $1 LIMIT 1`, [
    id,
  ]);
  return result.rowCount > 0;
};

const existsDuplicate = async ({ username, email, excludeId = null }) => {
  const result = await query(
    `SELECT 1 FROM ${TABLE}
     WHERE (username = $1 OR email = $2)
       AND ($3::int IS NULL OR id <> $3)
     LIMIT 1`,
    [username, email, excludeId]
  );
  return result.rowCount > 0;
};

const updateStatus = async (id, status) => {
  const result = await query(
    `UPDATE ${TABLE} SET status = $1, updated_at = NOW() WHERE id = $2
     RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [status, id]
  );
  return result.rows[0] || null;
};

module.exports = {
  list,
  findById,
  findByIdWithPassword,
  findByUsernameOrEmail,
  create,
  update,
  updateStatus,
  remove,
  existsById,
  existsDuplicate,
};
