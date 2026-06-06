const { buildExcelReport, formatDisplayDate } = require('./report-format');

const REPORT_NAME = 'Transaction Master Report';

const COLUMNS = [
  { header: 'Payment Type', key: 'payment_type', width: 16, align: 'center' },
  { header: 'Account', key: 'account', width: 18 },
  { header: 'Project', key: 'project_name', width: 18 },
  { header: 'Number', key: 'number', width: 12, align: 'center' },
  { header: 'Transaction No', key: 'transaction_no', width: 18 },
  { header: 'Customer', key: 'customer_name', width: 20 },
  { header: 'Transaction Date', key: 'transaction_date', width: 16, align: 'center', type: 'date' },
  { header: 'Plan', key: 'plan_type', width: 14, align: 'center' },
  { header: 'Created At', key: 'created_at', width: 16, align: 'center', type: 'date' },
];

const valueResolver = (row, key) => {
  if (key === 'transaction_date' || key === 'created_at') {
    return formatDisplayDate(row[key]);
  }
  return row[key] ?? '';
};

const generateTransactionsMasterReport = async ({ rows, startDate, endDate }) =>
  buildExcelReport({
    reportName: REPORT_NAME,
    sheetName: 'Transactions',
    startDate,
    endDate,
    dateFieldLabel: 'TRANSACTION DATE',
    columns: COLUMNS,
    rows,
    valueResolver,
    includeSerialNumber: true,
  });

module.exports = {
  REPORT_NAME,
  COLUMNS,
  generateTransactionsMasterReport,
};
