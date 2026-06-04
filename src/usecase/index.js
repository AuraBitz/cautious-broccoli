const dataaccess = require('../dataaccess');
const { createSuccessResponse } = require('../utils');
const clientManagement = require('./client-management.usecase');
const clientLoginMaster = require('./client-login-master.usecase');
const parentModulesMaster = require('./parent-modules-master.usecase');
const subModuleMaster = require('./sub-module-master.usecase');
const plansMaster = require('./plans-master.usecase');
const projectMaster = require('./project-master.usecase');
const rolesMaster = require('./roles-master.usecase');
const plansTracker = require('./plans-tracker.usecase');

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
  plansMaster,
  projectMaster,
  rolesMaster,
  plansTracker,
};
