const createCrudRepository = require('./crud-repository');

const COLUMNS = [
  'id',
  'name',
  'description',
  'plan_ids',
  'project_start_at',
  'status',
  'module_ids',
];

module.exports = createCrudRepository({
  table: 'project_master',
  columns: COLUMNS,
  insertColumns: [
    'name',
    'description',
    'plan_ids',
    'project_start_at',
    'status',
    'module_ids',
  ],
  updatableColumns: [
    'name',
    'description',
    'plan_ids',
    'project_start_at',
    'status',
    'module_ids',
  ],
  defaultSortField: 'id',
  filterFields: ['id', 'name', 'status', 'project_start_at'],
  sortFields: COLUMNS,
});
