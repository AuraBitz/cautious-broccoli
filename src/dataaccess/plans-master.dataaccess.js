const createCrudRepository = require('./crud-repository');

const COLUMNS = [
  'id',
  'plan_type',
  'plan_valid_days',
  'plan_modules_id',
  'amount',
  'discount_amount',
  'created_at',
  'created_by',
  'updated_at',
  'updated_by',
];

const repo = createCrudRepository({
  table: 'plans_master',
  columns: COLUMNS,
  insertColumns: [
    'plan_type',
    'plan_valid_days',
    'plan_modules_id',
    'amount',
    'discount_amount',
    'created_by',
    'updated_by',
  ],
  updatableColumns: [
    'plan_type',
    'plan_valid_days',
    'plan_modules_id',
    'amount',
    'discount_amount',
    'updated_by',
  ],
  defaultSortField: 'created_at',
  filterFields: [
    'id',
    'plan_type',
    'plan_valid_days',
    'amount',
    'discount_amount',
    'created_at',
    'created_by',
    'updated_at',
    'updated_by',
  ],
  sortFields: COLUMNS,
});

const create = async (payload) =>
  repo.create({
    ...payload,
    plan_modules_id: payload.plan_modules_id || [],
    updated_by: payload.created_by ?? payload.updated_by ?? null,
  });

const update = async (id, payload) =>
  repo.update(id, payload, ['updated_at = NOW()']);

const findByIds = async (ids = []) => {
  if (!ids.length) return [];
  const { query } = require('../connectivity/postgres');
  const result = await query(
    `SELECT id, plan_valid_days FROM plans_master WHERE id = ANY($1::int[])`,
    [ids]
  );
  return result.rows;
};

module.exports = {
  ...repo,
  create,
  update,
  findByIds,
};
