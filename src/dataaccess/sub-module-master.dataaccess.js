const createCrudRepository = require('./crud-repository');

const COLUMNS = [
  'id',
  'parent_module_id',
  'sub_module_name',
  'status',
  'created_at',
];

module.exports = createCrudRepository({
  table: 'sub_module_master',
  columns: COLUMNS,
  insertColumns: ['parent_module_id', 'sub_module_name', 'status'],
  updatableColumns: ['parent_module_id', 'sub_module_name', 'status'],
  defaultSortField: 'created_at',
  filterFields: COLUMNS,
  sortFields: COLUMNS,
});
