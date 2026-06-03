const usecase = require('../usecase');
const { createErrorResponse } = require('../utils');
const clientManagement = require('./client-management.controller');
const clientLoginMaster = require('./client-login-master.controller');
const parentModulesMaster = require('./parent-modules-master.controller');
const subModuleMaster = require('./sub-module-master.controller');
const plansMaster = require('./plans-master.controller');
const projectMaster = require('./project-master.controller');

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
  plansMaster,
  projectMaster,
};
