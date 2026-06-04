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
    plansMaster,
    projectMaster,
    rolesMaster,
    plansTracker,
  } = controller;

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
  router.get('/client-management/:id', clientManagement.getById);
  router.post('/client-management', clientManagement.create);
  router.patch('/client-management/:id', clientManagement.update);
  router.delete('/client-management/:id', clientManagement.remove);

  router.post('/parent-modules/list', parentModulesMaster.list);
  router.post('/parent-modules', parentModulesMaster.create);
  router.patch('/parent-modules/:id', parentModulesMaster.update);
  router.delete('/parent-modules/:id', parentModulesMaster.remove);

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
  router.get('/projects/:id', projectMaster.getById);
  router.post('/projects', projectMaster.create);
  router.patch('/projects/:id', projectMaster.update);
  router.delete('/projects/:id', projectMaster.remove);

  router.post('/plans-tracker/list', plansTracker.list);
  router.post('/plans-tracker/get-plan', plansTracker.getPlan);

  router.post('/roles-master/list', rolesMaster.list);
  router.post('/roles-master', rolesMaster.create);
  router.patch('/roles-master/:id', rolesMaster.update);
  router.delete('/roles-master/:id', rolesMaster.remove);

  return router;
};

module.exports = createRoutes;
