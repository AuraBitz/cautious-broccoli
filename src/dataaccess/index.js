const { query, getPool } = require('../connectivity/postgres');
const utils = require('../utils');
const clientManagement = require('./client-management.dataaccess');
const clientLoginMaster = require('./client-login-master.dataaccess');
const parentModulesMaster = require('./parent-modules-master.dataaccess');
const subModuleMaster = require('./sub-module-master.dataaccess');
const childModuleMaster = require('./child-module-master.dataaccess');
const plansMaster = require('./plans-master.dataaccess');
const projectMaster = require('./project-master.dataaccess');
const rolesMaster = require('./roles-master.dataaccess');
const paymentTypeMaster = require('./payment-type-master.dataaccess');
const transactionsMaster = require('./transactions-master.dataaccess');
const permissionsMaster = require('./permissions-master.dataaccess');
const plansTracker = require('./plans-tracker.dataaccess');
const restaurantMaster = require('./restaurant-master.dataaccess');
const projectPermissionMaster = require('./project-permission-master.dataaccess');
const projectRoleMaster = require('./project-role-master.dataaccess');
const employeeLoginMaster = require('./employee-login-master.dataaccess');
const employeeMaster = require('./employee-master.dataaccess');
const restaurantMenuMaster = require('./restaurant-menu-master.dataaccess');
const restaurantCustomerManagement = require('./restaurant-customer-management.dataaccess');
const restaurantFloorMaster = require('./restaurant-floor-master.dataaccess');
const restaurantTableMaster = require('./restaurant-table-master.dataaccess');
const restaurantBookingMaster = require('./restaurant-booking-master.dataaccess');
const restaurantTransactionMaster = require('./restaurant-transaction-master.dataaccess');
const restaurantOrderManagement = require('./restaurant-order-management.dataaccess');
const restaurantPaymentMaster = require('./restaurant-payment-master.dataaccess');
const restaurantLiveTableMatrixMaster = require('./restaurant-live-table-matrix-master.dataaccess');

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
  childModuleMaster,
  plansMaster,
  projectMaster,
  rolesMaster,
  paymentTypeMaster,
  transactionsMaster,
  permissionsMaster,
  plansTracker,
  restaurantMaster,
  projectPermissionMaster,
  projectRoleMaster,
  employeeLoginMaster,
  employeeMaster,
  restaurantMenuMaster,
  restaurantCustomerManagement,
  restaurantFloorMaster,
  restaurantTableMaster,
  restaurantBookingMaster,
  restaurantTransactionMaster,
  restaurantOrderManagement,
  restaurantPaymentMaster,
  restaurantLiveTableMatrixMaster,
};
