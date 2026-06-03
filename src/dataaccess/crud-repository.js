const { query } = require('../connectivity/postgres');
const { buildListQuery } = require('../utils/list-query-builder');

const createCrudRepository = ({
  table,
  columns,
  insertColumns,
  updatableColumns,
  defaultSortField = 'id',
  filterFields,
  sortFields,
}) => {
  const selectColumns = columns;
  const allowedFilters = filterFields || columns;
  const allowedSort = sortFields || columns;

  const list = async (body) => {
    const built = buildListQuery({
      table,
      selectColumns,
      allowedFilterFields: allowedFilters,
      allowedSortFields: allowedSort,
      defaultSortField,
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
      `SELECT ${selectColumns.join(', ')} FROM ${table} WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  };

  const create = async (payload) => {
    const keys = insertColumns.filter((k) => payload[k] !== undefined);
    const values = keys.map((k) => payload[k]);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const result = await query(
      `INSERT INTO ${table} (${keys.join(', ')})
       VALUES (${placeholders.join(', ')})
       RETURNING ${selectColumns.join(', ')}`,
      values
    );
    return result.rows[0];
  };

  const update = async (id, payload, extraSets = []) => {
    const fields = [...extraSets];
    const values = [];
    let idx = 1;

    updatableColumns.forEach((key) => {
      if (payload[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(payload[key]);
      }
    });

    if (!fields.length) return findById(id);

    values.push(id);
    const result = await query(
      `UPDATE ${table} SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING ${selectColumns.join(', ')}`,
      values
    );
    return result.rows[0] || null;
  };

  const remove = async (id) => {
    const result = await query(
      `DELETE FROM ${table} WHERE id = $1 RETURNING id`,
      [id]
    );
    return result.rows[0] || null;
  };

  const existsById = async (id) => {
    const result = await query(`SELECT 1 FROM ${table} WHERE id = $1 LIMIT 1`, [
      id,
    ]);
    return result.rowCount > 0;
  };

  const existsAllByIds = async (ids = []) => {
    if (!ids.length) return true;
    const result = await query(
      `SELECT COUNT(*)::int AS count FROM ${table} WHERE id = ANY($1::int[])`,
      [ids]
    );
    return result.rows[0].count === ids.length;
  };

  return { list, findById, create, update, remove, existsById, existsAllByIds };
};

module.exports = createCrudRepository;
