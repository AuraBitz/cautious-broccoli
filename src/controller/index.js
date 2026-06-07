const usecase = require('../usecase');
const { createErrorResponse } = require('../utils');
const clientManagement = require('./client-management.controller');
const clientLoginMaster = require('./client-login-master.controller');
const parentModulesMaster = require('./parent-modules-master.controller');
const subModuleMaster = require('./sub-module-master.controller');
const childModuleMaster = require('./child-module-master.controller');
const plansMaster = require('./plans-master.controller');
const projectMaster = require('./project-master.controller');
const rolesMaster = require('./roles-master.controller');
const paymentTypeMaster = require('./payment-type-master.controller');
const transactionsMaster = require('./transactions-master.controller');
const permissionsMaster = require('./permissions-master.controller');
const plansTracker = require('./plans-tracker.controller');
const restaurantMaster = require('./restaurant-master.controller');
const projectPermissionMaster = require('./project-permission-master.controller');
const projectRoleMaster = require('./project-role-master.controller');
const employeeLoginMaster = require('./employee-login-master.controller');
const employeeMaster = require('./employee-master.controller');
const restaurantMenuMaster = require('./restaurant-menu-master.controller');
const restaurantCustomerManagement = require('./restaurant-customer-management.controller');
const restaurantFloorMaster = require('./restaurant-floor-master.controller');
const restaurantTableMaster = require('./restaurant-table-master.controller');
const restaurantBookingMaster = require('./restaurant-booking-master.controller');
const restaurantTransactionMaster = require('./restaurant-transaction-master.controller');
const restaurantOrderManagement = require('./restaurant-order-management.controller');
const restaurantOrderMaster = require('./restaurant-order-master.controller');
const restaurantPaymentMaster = require('./restaurant-payment-master.controller');
const restaurantLiveTableMatrixMaster = require('./restaurant-live-table-matrix-master.controller');
const restaurantCallWaiter = require('./restaurant-call-waiter.controller');

const healthCheck = async (req, res, next) => {
  try {
    const result = await usecase.healthCheck();
    res.status(result.statusCode).json(result);
  } catch (error) {
    next(error);
  }
};

const notFound = (req, res) => {
  res.status(404).json(
    createErrorResponse({
      statusCode: 404,
      message: 'Route not found',
      code: 'NOT_FOUND',
    })
  );
};

module.exports = {
  healthCheck,
  notFound,
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
