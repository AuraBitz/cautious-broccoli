const createCrudRepository = require('./crud-repository');

const COLUMNS = ['id', 'module_name', 'status', 'created_at'];

module.exports = createCrudRepository({
  table: 'parent_modules_master',
  columns: COLUMNS,
  insertColumns: ['module_name', 'status'],
  updatableColumns: ['module_name', 'status'],
  defaultSortField: 'created_at',
  filterFields: COLUMNS,
  sortFields: COLUMNS,
});
