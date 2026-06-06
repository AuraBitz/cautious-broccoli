const express = require('express');
const controller = require('../controller');
const authMiddleware = require('../middleware/auth.middleware');

const createRoutes = () => {
  const router = express.Router();
  const {
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
  } = controller;

  router.post('/public/restaurant-master/list', restaurantMaster.publicList);
  router.get('/public/restaurant-master/:id', restaurantMaster.publicGetById);
  router.get(
    '/public/restaurant-live-table-matrix-master/by-restaurant/:restaurantId',
    restaurantLiveTableMatrixMaster.getPublicByRestaurantId
  );
  router.post(
    '/public/restaurant-booking-master',
    restaurantBookingMaster.create
  );
  router.get(
    '/public/restaurant-menu-master/by-restaurant/:restaurantId',
    restaurantMenuMaster.listByRestaurant
  );

  router.use(authMiddleware);

  router.get('/health', controller.healthCheck);

  router.post('/client-login/login', clientLoginMaster.login);
  router.post('/client-login/logout', clientLoginMaster.logout);
  router.get('/client-login/me', clientLoginMaster.me);
  router.post('/client-login/list', clientLoginMaster.list);
  router.get('/client-login/:id', clientLoginMaster.getById);
  router.post('/client-login', clientLoginMaster.create);
  router.patch('/client-login/:id', clientLoginMaster.update);
  router.delete('/client-login/:id', clientLoginMaster.remove);

  router.post('/client-management/list', clientManagement.list);
  router.post(
    '/client-management/report/download',
    clientManagement.downloadReport
  );
  router.get('/client-management/:id', clientManagement.getById);
  router.post('/client-management', clientManagement.create);
  router.patch('/client-management/:id', clientManagement.update);
  router.delete('/client-management/:id', clientManagement.remove);

  router.post('/parent-modules/list', parentModulesMaster.list);
  router.get('/parent-modules/:id', parentModulesMaster.getById);
  router.post('/parent-modules', parentModulesMaster.create);
  router.patch('/parent-modules/:id', parentModulesMaster.update);
  router.delete('/parent-modules/:id', parentModulesMaster.remove);

  router.post('/child-modules/list', childModuleMaster.list);
  router.get('/child-modules/:id', childModuleMaster.getById);
  router.post('/child-modules', childModuleMaster.create);
  router.patch('/child-modules/:id', childModuleMaster.update);
  router.delete('/child-modules/:id', childModuleMaster.remove);

  router.post('/sub-modules/list', subModuleMaster.list);
  router.post('/sub-modules', subModuleMaster.create);
  router.patch('/sub-modules/:id', subModuleMaster.update);
  router.delete('/sub-modules/:id', subModuleMaster.remove);

  router.post('/plans/list', plansMaster.list);
  router.get('/plans/:id', plansMaster.getById);
  router.post('/plans', plansMaster.create);
  router.patch('/plans/:id', plansMaster.update);
  router.delete('/plans/:id', plansMaster.remove);

  router.post('/projects/list', projectMaster.list);
  router.get('/projects/:id/portal-modules', projectMaster.getPortalModules);
  router.get('/projects/:id', projectMaster.getById);
  router.post('/projects', projectMaster.create);
  router.patch('/projects/:id', projectMaster.update);
  router.delete('/projects/:id', projectMaster.remove);

  router.post('/plans-tracker/list', plansTracker.list);
  router.post('/plans-tracker/report/download', plansTracker.downloadReport);
  router.post('/plans-tracker/get-plan', plansTracker.getPlan);

  router.post('/roles-master/list', rolesMaster.list);
  router.get('/roles-master/project/:projectId', rolesMaster.listByProject);
  router.get('/roles-master/:id', rolesMaster.getById);
  router.post('/roles-master', rolesMaster.create);
  router.patch('/roles-master/:id', rolesMaster.update);
  router.delete('/roles-master/:id', rolesMaster.remove);

  router.post('/payment-type-master/list', paymentTypeMaster.list);
  router.get('/payment-type-master/:id', paymentTypeMaster.getById);
  router.post('/payment-type-master', paymentTypeMaster.create);
  router.patch('/payment-type-master/:id', paymentTypeMaster.update);
  router.delete('/payment-type-master/:id', paymentTypeMaster.remove);

  router.post('/transactions-master/list', transactionsMaster.list);
  router.post(
    '/transactions-master/report/download',
    transactionsMaster.downloadReport
  );
  router.get('/transactions-master/:id', transactionsMaster.getById);
  router.post('/transactions-master', transactionsMaster.create);
  router.patch('/transactions-master/:id', transactionsMaster.update);
  router.delete('/transactions-master/:id', transactionsMaster.remove);

  router.post('/restaurant-master/list', restaurantMaster.list);
  router.get('/restaurant-master/:id', restaurantMaster.getById);
  router.post('/restaurant-master', restaurantMaster.create);
  router.patch('/restaurant-master/:id', restaurantMaster.update);
  router.delete('/restaurant-master/:id', restaurantMaster.remove);

  router.post('/employee-login/login', employeeLoginMaster.login);
  router.post('/employee-login/logout', employeeLoginMaster.logout);
  router.post('/employee-login/list', employeeLoginMaster.list);
  router.get('/employee-login/:id', employeeLoginMaster.getById);
  router.post('/employee-login', employeeLoginMaster.create);
  router.patch('/employee-login/:id', employeeLoginMaster.update);
  router.delete('/employee-login/:id', employeeLoginMaster.remove);

  router.post('/employee-master/list', employeeMaster.list);
  router.get('/employee-master/:id', employeeMaster.getById);
  router.post('/employee-master', employeeMaster.create);
  router.patch('/employee-master/:id', employeeMaster.update);
  router.delete('/employee-master/:id', employeeMaster.remove);

  router.post('/project-role-master/list', projectRoleMaster.list);
  router.get(
    '/project-role-master/project/:projectId',
    projectRoleMaster.listByProject
  );
  router.get('/project-role-master/:id', projectRoleMaster.getById);
  router.post('/project-role-master', projectRoleMaster.create);
  router.patch('/project-role-master/:id', projectRoleMaster.update);
  router.delete('/project-role-master/:id', projectRoleMaster.remove);

  router.post('/project-permission-master/list', projectPermissionMaster.list);
  router.get('/project-permission-master/:id', projectPermissionMaster.getById);
  router.post('/project-permission-master', projectPermissionMaster.create);
  router.patch(
    '/project-permission-master/:id',
    projectPermissionMaster.update
  );
  router.delete(
    '/project-permission-master/:id',
    projectPermissionMaster.remove
  );

  router.post('/permissions-master/list', permissionsMaster.list);
  router.get('/permissions-master/:id', permissionsMaster.getById);
  router.post('/permissions-master', permissionsMaster.create);
  router.patch('/permissions-master/:id', permissionsMaster.update);
  router.delete('/permissions-master/:id', permissionsMaster.remove);

  router.post('/restaurant-menu-master/list', restaurantMenuMaster.list);
  router.get('/restaurant-menu-master/:id', restaurantMenuMaster.getById);
  router.post('/restaurant-menu-master', restaurantMenuMaster.create);
  router.patch('/restaurant-menu-master/:id', restaurantMenuMaster.update);
  router.delete('/restaurant-menu-master/:id', restaurantMenuMaster.remove);

  router.post(
    '/restaurant-customer-management/list',
    restaurantCustomerManagement.list
  );
  router.get(
    '/restaurant-customer-management/:id',
    restaurantCustomerManagement.getById
  );
  router.post('/restaurant-customer-management', restaurantCustomerManagement.create);
  router.patch(
    '/restaurant-customer-management/:id',
    restaurantCustomerManagement.update
  );
  router.delete(
    '/restaurant-customer-management/:id',
    restaurantCustomerManagement.remove
  );

  router.post('/restaurant-floor-master/list', restaurantFloorMaster.list);
  router.get('/restaurant-floor-master/:id', restaurantFloorMaster.getById);
  router.post('/restaurant-floor-master', restaurantFloorMaster.create);
  router.patch('/restaurant-floor-master/:id', restaurantFloorMaster.update);
  router.delete('/restaurant-floor-master/:id', restaurantFloorMaster.remove);

  router.post('/restaurant-table-master/list', restaurantTableMaster.list);
  router.get('/restaurant-table-master/:id', restaurantTableMaster.getById);
  router.post('/restaurant-table-master', restaurantTableMaster.create);
  router.patch('/restaurant-table-master/:id', restaurantTableMaster.update);
  router.delete('/restaurant-table-master/:id', restaurantTableMaster.remove);

  router.post('/restaurant-booking-master/list', restaurantBookingMaster.list);
  router.get('/restaurant-booking-master/:id', restaurantBookingMaster.getById);
  router.post('/restaurant-booking-master', restaurantBookingMaster.create);
  router.patch('/restaurant-booking-master/:id', restaurantBookingMaster.update);
  router.delete('/restaurant-booking-master/:id', restaurantBookingMaster.remove);

  router.post(
    '/restaurant-transaction-master/list',
    restaurantTransactionMaster.list
  );
  router.get(
    '/restaurant-transaction-master/:id',
    restaurantTransactionMaster.getById
  );
  router.post('/restaurant-transaction-master', restaurantTransactionMaster.create);
  router.patch(
    '/restaurant-transaction-master/:id',
    restaurantTransactionMaster.update
  );
  router.delete(
    '/restaurant-transaction-master/:id',
    restaurantTransactionMaster.remove
  );

  router.post('/restaurant-order-management/list', restaurantOrderManagement.list);
  router.get('/restaurant-order-management/:id', restaurantOrderManagement.getById);
  router.post('/restaurant-order-management', restaurantOrderManagement.create);
  router.patch('/restaurant-order-management/:id', restaurantOrderManagement.update);
  router.delete('/restaurant-order-management/:id', restaurantOrderManagement.remove);

  router.post('/restaurant-payment-master/list', restaurantPaymentMaster.list);
  router.get('/restaurant-payment-master/:id', restaurantPaymentMaster.getById);
  router.post('/restaurant-payment-master', restaurantPaymentMaster.create);
  router.patch('/restaurant-payment-master/:id', restaurantPaymentMaster.update);
  router.delete('/restaurant-payment-master/:id', restaurantPaymentMaster.remove);

  router.post(
    '/restaurant-live-table-matrix-master/list',
    restaurantLiveTableMatrixMaster.list
  );
  router.get(
    '/restaurant-live-table-matrix-master/by-restaurant/:restaurantId',
    restaurantLiveTableMatrixMaster.getByRestaurantId
  );
  router.put(
    '/restaurant-live-table-matrix-master/by-restaurant/:restaurantId',
    restaurantLiveTableMatrixMaster.upsertByRestaurantId
  );
  router.get('/restaurant-live-table-matrix-master/:id', restaurantLiveTableMatrixMaster.getById);
  router.delete(
    '/restaurant-live-table-matrix-master/:id',
    restaurantLiveTableMatrixMaster.remove
  );

  return router;
};

module.exports = createRoutes;
