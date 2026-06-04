const { query, getPool } = require('../connectivity/postgres');
const utils = require('../utils');
const clientManagement = require('./client-management.dataaccess');
const clientLoginMaster = require('./client-login-master.dataaccess');
const parentModulesMaster = require('./parent-modules-master.dataaccess');
const subModuleMaster = require('./sub-module-master.dataaccess');
const plansMaster = require('./plans-master.dataaccess');
const projectMaster = require('./project-master.dataaccess');
const rolesMaster = require('./roles-master.dataaccess');
const plansTracker = require('./plans-tracker.dataaccess');

const healthCheck = async () => {
  await query('SELECT 1 AS ok');
  return { database: 'connected' };
};

module.exports = {
  query,
  getPool,
  healthCheck,
  utils,
  clientManagement,
  clientLoginMaster,
  parentModulesMaster,
  subModuleMaster,
  plansMaster,
  projectMaster,
  rolesMaster,
  plansTracker,
};
