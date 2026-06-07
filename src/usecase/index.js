const dataaccess = require('../dataaccess');
const { createSuccessResponse } = require('../utils');
const clientManagement = require('./client-management.usecase');
const clientLoginMaster = require('./client-login-master.usecase');
const parentModulesMaster = require('./parent-modules-master.usecase');
const subModuleMaster = require('./sub-module-master.usecase');
const childModuleMaster = require('./child-module-master.usecase');
const plansMaster = require('./plans-master.usecase');
const projectMaster = require('./project-master.usecase');
const rolesMaster = require('./roles-master.usecase');
const paymentTypeMaster = require('./payment-type-master.usecase');
const transactionsMaster = require('./transactions-master.usecase');
const permissionsMaster = require('./permissions-master.usecase');
const plansTracker = require('./plans-tracker.usecase');
const restaurantMaster = require('./restaurant-master.usecase');
const projectPermissionMaster = require('./project-permission-master.usecase');
const projectRoleMaster = require('./project-role-master.usecase');
const employeeLoginMaster = require('./employee-login-master.usecase');
const employeeMaster = require('./employee-master.usecase');
const restaurantMenuMaster = require('./restaurant-menu-master.usecase');
const restaurantCustomerManagement = require('./restaurant-customer-management.usecase');
const restaurantFloorMaster = require('./restaurant-floor-master.usecase');
const restaurantTableMaster = require('./restaurant-table-master.usecase');
const restaurantBookingMaster = require('./restaurant-booking-master.usecase');
const restaurantTransactionMaster = require('./restaurant-transaction-master.usecase');
const restaurantOrderManagement = require('./restaurant-order-management.usecase');
const restaurantOrderMaster = require('./restaurant-order-master.usecase');
const restaurantPaymentMaster = require('./restaurant-payment-master.usecase');
const restaurantLiveTableMatrixMaster = require('./restaurant-live-table-matrix-master.usecase');
const restaurantCallWaiter = require('./restaurant-call-waiter.usecase');

const healthCheck = async () => {
  const data = await dataaccess.healthCheck();
  return createSuccessResponse({
    message: 'Service is healthy',
    data,
  });
};

module.exports = {
  healthCheck,
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
  restaurantOrderMaster,
  restaurantPaymentMaster,
  restaurantLiveTableMatrixMaster,
  restaurantCallWaiter,
};
