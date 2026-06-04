const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 10000;

const parsePagination = (body = {}) => {
  const skip = Math.max(0, Number(body.skip) || 0);
  let limit = Number(body.limit) || DEFAULT_LIMIT;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  return { skip, limit };
};

const parseSort = (body = {}, allowedFields = [], defaultField = 'id') => {
  const sort = body.sort || {};
  const field = allowedFields.includes(sort.field) ? sort.field : defaultField;
  const orderRaw = String(sort.order || 'desc').toLowerCase();
  const order = orderRaw === 'asc' ? 'ASC' : 'DESC';
  return { field, order };
};

const { buildWhereClauseV2 } = require('./filter-builder-v2');

const buildWhereClause = (filters = {}, allowedFields = [], fieldTypes = {}) =>
  buildWhereClauseV2(filters, allowedFields, fieldTypes);

const buildListQuery = ({
  table,
  selectColumns,
  allowedFilterFields,
  allowedSortFields,
  defaultSortField = 'id',
  body = {},
  filterFieldTypes = {},
}) => {
  const { skip, limit } = parsePagination(body);
  const { field: sortField, order: sortOrder } = parseSort(
    body,
    allowedSortFields,
    defaultSortField
  );
  const {
    whereSql,
    values,
    paramIndex: whereParamIndex,
  } = buildWhereClause(body.filters, allowedFilterFields, filterFieldTypes);

  let paramIndex = whereParamIndex;
  const selectSql = selectColumns.join(', ');
  const orderSql = `ORDER BY "${sortField}" ${sortOrder}`;
  const limitSql = `LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
  const listValues = [...values, limit, skip];

  const listQuery = `
    SELECT ${selectSql}
    FROM ${table}
    ${whereSql}
    ${orderSql}
    ${limitSql}
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS total
    FROM ${table}
    ${whereSql}
  `;

  return {
    listQuery,
    countQuery,
    listValues,
    countValues: values,
    skip,
    limit,
    sort: { field: sortField, order: sortOrder.toLowerCase() },
  };
};

module.exports = {
  parsePagination,
  parseSort,
  buildWhereClause,
  buildListQuery,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
