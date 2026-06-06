const { query } = require('../connectivity/postgres');
const { buildListQuery } = require('../utils/list-query-builder');

const TABLE = 'employee_login_master';

const SELECT_COLUMNS = ['id', 'created_at'];

const FILTER_FIELDS = ['id', 'created_at'];
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

const create = async (payload) => {
  const result = await query(
    `INSERT INTO ${TABLE} (password)
     VALUES ($1)
     RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [payload.password]
  );
  return result.rows[0];
};

const update = async (id, payload) => {
  if (payload.password === undefined) return findById(id);

  const result = await query(
    `UPDATE ${TABLE} SET password = $1 WHERE id = $2
     RETURNING ${SELECT_COLUMNS.join(', ')}`,
    [payload.password, id]
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

module.exports = {
  list,
  findById,
  findByIdWithPassword,
  create,
  update,
  remove,
  existsById,
};
