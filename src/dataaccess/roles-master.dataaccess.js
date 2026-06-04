const createCrudRepository = require('./crud-repository');

const COLUMNS = ['id', 'role_code', 'role_name', 'description', 'status', 'created_at'];

module.exports = createCrudRepository({
  table: 'roles_master',
  columns: COLUMNS,
  insertColumns: ['role_code', 'role_name', 'description', 'status'],
  updatableColumns: ['role_code', 'role_name', 'description', 'status'],
  defaultSortField: 'created_at',
  filterFields: COLUMNS,
  sortFields: COLUMNS,
});
