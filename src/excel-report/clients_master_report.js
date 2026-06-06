const { buildExcelReport, formatDisplayDate } = require('./report-format');

const REPORT_NAME = 'Clients Master Report';

const COLUMNS = [
  { header: 'Restaurant', key: 'restaurant_name', width: 24 },
  { header: 'Owner Name', key: 'owner_name', width: 20 },
  { header: 'Mobile', key: 'mobile', width: 16, align: 'center' },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Project', key: 'project_name', width: 20 },
  { header: 'Plan Type', key: 'plan_type', width: 16, align: 'center' },
  { header: 'Plan Amount', key: 'plan_amount', width: 14, align: 'center' },
  { header: 'City', key: 'city', width: 14 },
  { header: 'State', key: 'state', width: 14 },
  { header: 'Country', key: 'country', width: 14 },
  { header: 'Plan Status', key: 'plan_status', width: 14, align: 'center' },
  { header: 'Days Left', key: 'plan_remain_days', width: 12, align: 'center', type: 'number' },
  { header: 'Created At', key: 'created_at', width: 16, align: 'center', type: 'date' },
];

const valueResolver = (row, key) => {
  if (key === 'created_at' || key === 'applied_at' || key === 'plan_start_at') {
    return formatDisplayDate(row[key]);
  }
  if (key === 'plan_amount' && row[key] != null) {
    return Number(row[key]);
  }
  if (key === 'plan_remain_days') {
    return row[key] == null ? '' : Number(row[key]);
  }
  return row[key] ?? '';
};

/**
 * @param {object} params
 * @param {object[]} params.rows
 * @param {string} [params.startDate]
 * @param {string} [params.endDate]
 */
const generateClientsMasterReport = async ({ rows, startDate, endDate }) =>
  buildExcelReport({
    reportName: REPORT_NAME,
    sheetName: 'Clients',
    startDate,
    endDate,
    dateFieldLabel: 'CREATED AT',
    columns: COLUMNS,
    rows,
    valueResolver,
    includeSerialNumber: true,
  });

module.exports = {
  REPORT_NAME,
  COLUMNS,
  generateClientsMasterReport,
};
