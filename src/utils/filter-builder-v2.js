const AppError = require('./app-error');

/**
 * Filter Builder V2 — list APIs use `{ field: { op, value } }`.
 * Aliases: equals/eq, contains/ilike, date_between/between, date_equals/eq.
 */

const OP_ALIASES = {
  equals: 'eq',
  equal: 'eq',
  notequals: 'ne',
  contains: 'ilike',
  notcontains: 'not_ilike',
  startswith: 'ilike',
  endswith: 'ilike',
  dateequals: 'eq',
  date_equals: 'eq',
  datebetween: 'between',
  date_between: 'between',
  greaterthan: 'gt',
  lessthan: 'lt',
  greaterthanorequal: 'gte',
  lessthanorequal: 'lte',
};

const SQL_OPERATORS = {
  eq: '=',
  ne: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'LIKE',
  ilike: 'ILIKE',
  not_ilike: 'NOT ILIKE',
  in: 'IN',
  between: 'BETWEEN',
};

const DEFAULT_DATE_FIELD_HINTS = new Set([
  'created_at',
  'updated_at',
  'applied_at',
  'plan_start_at',
  'project_start_at',
  'purchase_at',
]);

const normalizeOp = (op) => {
  const raw = String(op || 'eq').toLowerCase().trim();
  return OP_ALIASES[raw] || raw;
};

const isDateField = (field, fieldTypes = {}) => {
  if (fieldTypes[field] === 'date' || fieldTypes[field] === 'datetime') {
    return true;
  }
  return DEFAULT_DATE_FIELD_HINTS.has(field);
};

const IST_OFFSET = '+05:30';

const toDateBound = (value, bound = 'start') => {
  if (value == null || value === '') return value;

  const str = String(value).trim();
  const dateOnly = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (dateOnly) {
    const day = dateOnly[0];
    return bound === 'end'
      ? `${day}T23:59:59.999${IST_OFFSET}`
      : `${day}T00:00:00${IST_OFFSET}`;
  }

  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  if (!year || !month || !day) return d.toISOString();

  const ymd = `${year}-${month}-${day}`;
  return bound === 'end'
    ? `${ymd}T23:59:59.999${IST_OFFSET}`
    : `${ymd}T00:00:00${IST_OFFSET}`;
};

const normalizeFilterValue = (field, op, value, fieldTypes) => {
  if (!isDateField(field, fieldTypes)) return value;

  if (op === 'between' && Array.isArray(value)) {
    return [toDateBound(value[0], 'start'), toDateBound(value[1], 'end')];
  }

  if (op === 'eq' || op === 'gte' || op === 'gt') {
    return toDateBound(value, 'start');
  }

  if (op === 'lte' || op === 'lt') {
    return toDateBound(value, 'end');
  }

  return value;
};

const wrapContainsValue = (op, value) => {
  if (value == null) return value;
  const str = String(value);
  if (op === 'ilike' || op === 'like' || op === 'not_ilike') {
    if (str.includes('%')) return str;
    return `%${str}%`;
  }
  return value;
};

const parseFilterDef = (filterDef) => {
  if (filterDef && typeof filterDef === 'object' && 'op' in filterDef) {
    return {
      op: normalizeOp(filterDef.op),
      value: filterDef.value,
    };
  }
  return { op: 'eq', value: filterDef };
};

const buildWhereClauseV2 = (
  filters = {},
  allowedFields = [],
  fieldTypes = {}
) => {
  const conditions = [];
  const values = [];
  let paramIndex = 1;

  Object.entries(filters).forEach(([field, filterDef]) => {
    if (!allowedFields.includes(field)) return;

    let { op, value } = parseFilterDef(filterDef);
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
      const list = Array.isArray(value) ? value : [];
      if (!list.length) return;
      const placeholders = list.map(() => `$${paramIndex++}`);
      values.push(...list);
      conditions.push(`${column} IN (${placeholders.join(', ')})`);
      return;
    }

    if (op === 'between') {
      const range = Array.isArray(value) ? value : [];
      if (range.length !== 2) return;
      const normalized = normalizeFilterValue(field, op, range, fieldTypes);
      conditions.push(
        `${column} BETWEEN $${paramIndex++} AND $${paramIndex++}`
      );
      values.push(normalized[0], normalized[1]);
      return;
    }

    if (op === 'eq' && isDateField(field, fieldTypes)) {
      const dayStart = toDateBound(value, 'start');
      const dayEnd = toDateBound(value, 'end');
      conditions.push(
        `${column} BETWEEN $${paramIndex++} AND $${paramIndex++}`
      );
      values.push(dayStart, dayEnd);
      return;
    }

    if (!SQL_OPERATORS[op]) {
      throw new AppError(
        `Invalid filter operator: ${op}`,
        400,
        'INVALID_FILTER'
      );
    }

    if (value === undefined || value === null || value === '') return;

    value = normalizeFilterValue(field, op, value, fieldTypes);
    const sqlOp = SQL_OPERATORS[op];

    if (op === 'ilike' || op === 'like' || op === 'not_ilike') {
      conditions.push(`${column} ${sqlOp} $${paramIndex++}`);
      values.push(wrapContainsValue(op, value));
      return;
    }

    conditions.push(`${column} ${sqlOp} $${paramIndex++}`);
    values.push(value);
  });

  const whereSql = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  return { whereSql, values, paramIndex };
};

module.exports = {
  buildWhereClauseV2,
  normalizeOp,
  OP_ALIASES,
  SQL_OPERATORS,
  DEFAULT_DATE_FIELD_HINTS,
};
