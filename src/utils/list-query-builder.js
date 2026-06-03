const AppError = require('./app-error');

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

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

const OPERATORS = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  in: 'IN',
  between: 'BETWEEN',
  is_null: 'IS NULL',
  is_not_null: 'IS NOT NULL',
};

const buildWhereClause = (filters = {}, allowedFields = []) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  Object.entries(filters).forEach(([field, filterDef]) => {
    if (!allowedFields.includes(field)) return;

    const def =
      filterDef && typeof filterDef === 'object' && 'op' in filterDef
        ? filterDef
        : { op: 'eq', value: filterDef };

    const op = String(def.op || 'eq').toLowerCase();
    const column = `"${field}"`;

    if (op === 'is_null') {
      conditions.push(`${column} IS NULL`);
      return;
    }

    if (op === 'is_not_null') {
      conditions.push(`${column} IS NOT NULL`);
      return;
    }

    if (op === 'in') {
      const list = Array.isArray(def.value) ? def.value : [];
      if (!list.length) return;
      const placeholders = list.map(() => `$${paramIndex++}`);
      values.push(...list);
      conditions.push(`${column} IN (${placeholders.join(', ')})`);
      return;
    }

    if (op === 'between') {
      const range = Array.isArray(def.value) ? def.value : [];
      if (range.length !== 2) return;
      conditions.push(
        `${column} BETWEEN $${paramIndex++} AND $${paramIndex++}`
      );
      values.push(range[0], range[1]);
      return;
    }

    if (!OPERATORS[op]) {
      throw new AppError(
        `Invalid filter operator: ${op}`,
        400,
        'INVALID_FILTER'
      );
    }

    if (def.value === undefined || def.value === null) return;

    const sqlOp = OPERATORS[op];
    if (op === 'like' || op === 'ilike') {
      conditions.push(`${column} ${sqlOp} $${paramIndex++}`);
      values.push(`%${def.value}%`);
      return;
    }

    conditions.push(`${column} ${sqlOp} $${paramIndex++}`);
    values.push(def.value);
  });

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, values, paramIndex };
};

const buildListQuery = ({
  table,
  selectColumns,
  allowedFilterFields,
  allowedSortFields,
  defaultSortField = 'id',
  body = {},
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
  } = buildWhereClause(body.filters, allowedFilterFields);

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
