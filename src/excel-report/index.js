const reportFormat = require('./report-format');
const clientsMasterReport = require('./clients_master_report');
const transactionsMasterReport = require('./transactions_master_report');
const plansTrackerReport = require('./plans_tracker_report');

module.exports = {
  ...reportFormat,
  clientsMasterReport,
  transactionsMasterReport,
  plansTrackerReport,
};
