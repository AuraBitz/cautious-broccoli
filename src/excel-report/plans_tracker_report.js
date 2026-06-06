const { buildExcelReport, formatDisplayDate } = require('./report-format');

const REPORT_NAME = 'Plans Tracker Report';

const COLUMNS = [
  { header: 'Client Name', key: 'client_name', width: 22 },
  { header: 'Username', key: 'username', width: 16, align: 'center' },
  { header: 'Plan Type', key: 'plan_type', width: 16, align: 'center' },
  { header: 'Plan Amount', key: 'plan_amount', width: 14, align: 'center', type: 'number' },
  { header: 'Plan Validity', key: 'plan_validity', width: 14, align: 'center' },
  { header: 'Purchased At', key: 'purchase_at', width: 16, align: 'center', type: 'date' },
];

const valueResolver = (row, key) => {
  if (key === 'purchase_at') {
    return formatDisplayDate(row[key]);
  }
  if (key === 'plan_amount' && row[key] != null) {
    return Number(row[key]);
  }
  if (key === 'plan_validity') {
    return row[key] == null ? '' : `${row[key]} days`;
  }
  return row[key] ?? '';
};

const generatePlansTrackerReport = async ({ rows, startDate, endDate }) =>
  buildExcelReport({
    reportName: REPORT_NAME,
    sheetName: 'Plans Tracker',
    startDate,
    endDate,
    dateFieldLabel: 'PURCHASED AT',
    columns: COLUMNS,
    rows,
    valueResolver,
    includeSerialNumber: true,
  });

module.exports = {
  REPORT_NAME,
  COLUMNS,
  generatePlansTrackerReport,
};
