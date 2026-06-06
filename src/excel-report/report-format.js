const ExcelJS = require('exceljs');

/**
 * Exact palette sampled from Visitor Logs reference screenshot.
 */
const COLORS = {
  titleBarBg: 'FF1B7B74',
  titleBarText: 'FFFFFFFF',
  metaBandBg: 'FFF8F9F9',
  metaText: 'FF000000',
  headerBg: 'FFD0D7E0',
  headerText: 'FF000000',
  cellText: 'FF000000',
  cellBg: 'FFFFFFFF',
  cellAltBg: 'FFDFE3E6',
  border: 'FFBFBFBF',
};

const gridBorder = {
  top: { style: 'thin', color: { argb: COLORS.border } },
  left: { style: 'thin', color: { argb: COLORS.border } },
  bottom: { style: 'thin', color: { argb: COLORS.border } },
  right: { style: 'thin', color: { argb: COLORS.border } },
};

const STYLES = {
  titleBar: {
    font: { name: 'Calibri', size: 12, bold: true, color: { argb: COLORS.titleBarText } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.titleBarBg },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
  metaBand: {
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.metaBandBg },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
  dateRange: {
    font: {
      name: 'Calibri',
      size: 10,
      bold: false,
      italic: true,
      color: { argb: COLORS.metaText },
    },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
  metaInfo: {
    font: { name: 'Calibri', size: 10, bold: false, color: { argb: COLORS.metaText } },
    alignment: { horizontal: 'center', vertical: 'middle' },
  },
  header: {
    font: { name: 'Calibri', size: 10, bold: true, color: { argb: COLORS.headerText } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.headerBg },
    },
    alignment: { horizontal: 'center', vertical: 'middle', wrapText: true },
    border: gridBorder,
  },
  cell: {
    font: { name: 'Calibri', size: 10, bold: false, color: { argb: COLORS.cellText } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.cellBg },
    },
    alignment: { vertical: 'middle', wrapText: true },
    border: gridBorder,
  },
  cellAlt: {
    font: { name: 'Calibri', size: 10, bold: false, color: { argb: COLORS.cellText } },
    fill: {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: COLORS.cellAltBg },
    },
    alignment: { vertical: 'middle', wrapText: true },
    border: gridBorder,
  },
};

const SERIAL_KEY = '__sr_no__';

const colLetter = (index) => {
  let n = index;
  let s = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    s = String.fromCharCode(65 + rem) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
};

const formatDisplayDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(d);
  const day = parts.find((p) => p.type === 'day')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  return `${day}-${month}-${year}`;
};

const formatGeneratedAt = () => {
  const now = new Date();
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(now);
};

const formatDateRangeLabel = (startDate, endDate, dateFieldLabel = 'CREATED AT') => {
  if (startDate && endDate) {
    return `DATE RANGE (${dateFieldLabel}): ${formatDisplayDate(startDate)} to ${formatDisplayDate(endDate)}`;
  }
  if (startDate) {
    return `DATE RANGE (${dateFieldLabel}): From ${formatDisplayDate(startDate)}`;
  }
  if (endDate) {
    return `DATE RANGE (${dateFieldLabel}): Until ${formatDisplayDate(endDate)}`;
  }
  return `DATE RANGE (${dateFieldLabel}): All Records`;
};

const applyStyle = (cell, style) => {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.border) cell.border = style.border;
};

const applyMetaBandStyle = (cell, textStyle) => {
  applyStyle(cell, STYLES.metaBand);
  if (textStyle.font) cell.font = textStyle.font;
  if (textStyle.alignment) {
    cell.alignment = { ...STYLES.metaBand.alignment, ...textStyle.alignment };
  }
};

const resolveCellAlign = (col) => {
  if (col.align) return col.align;
  if (col.type === 'date' || col.type === 'number' || col.type === 'datetime') {
    return 'center';
  }
  return 'left';
};

/**
 * Reusable Excel report layout — matches Visitor Logs reference screenshot.
 */
const buildExcelReport = async ({
  reportName,
  sheetName = 'Report',
  startDate,
  endDate,
  dateFieldLabel = 'CREATED AT',
  columns,
  rows,
  valueResolver,
  includeSerialNumber = true,
}) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Compney Admin';
  workbook.created = new Date();

  const tableColumns = includeSerialNumber
    ? [
        { header: 'No.', key: SERIAL_KEY, width: 6, align: 'center', type: 'number' },
        ...columns,
      ]
    : columns;

  const colCount = tableColumns.length;
  const lastCol = colLetter(colCount);
  const headerRowIndex = 4;

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: 'frozen', ySplit: headerRowIndex }],
    properties: { defaultRowHeight: 15 },
  });

  tableColumns.forEach((col, idx) => {
    sheet.getColumn(idx + 1).width = col.width || 16;
  });

  sheet.mergeCells(`A1:${lastCol}1`);
  const titleCell = sheet.getCell('A1');
  titleCell.value = String(reportName).toUpperCase();
  applyStyle(titleCell, STYLES.titleBar);
  sheet.getRow(1).height = 26;

  sheet.mergeCells(`A2:${lastCol}2`);
  const rangeCell = sheet.getCell('A2');
  rangeCell.value = formatDateRangeLabel(startDate, endDate, dateFieldLabel);
  applyMetaBandStyle(rangeCell, STYLES.dateRange);
  sheet.getRow(2).height = 18;

  sheet.mergeCells(`A3:${lastCol}3`);
  const metaCell = sheet.getCell('A3');
  metaCell.value = `ROWS: ${rows.length} | GENERATED: ${formatGeneratedAt()}`;
  applyMetaBandStyle(metaCell, STYLES.metaInfo);
  sheet.getRow(3).height = 18;

  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.height = 20;
  tableColumns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    applyStyle(cell, STYLES.header);
  });

  const resolve = valueResolver || ((row, key) => row[key]);

  rows.forEach((row, rowIdx) => {
    const excelRow = sheet.getRow(headerRowIndex + 1 + rowIdx);
    excelRow.height = 17;
    const style = rowIdx % 2 === 0 ? STYLES.cell : STYLES.cellAlt;

    tableColumns.forEach((col, colIdx) => {
      const cell = excelRow.getCell(colIdx + 1);
      let value;

      if (col.key === SERIAL_KEY) {
        value = rowIdx + 1;
      } else {
        value = resolve(row, col.key);
        if (value === null || value === undefined) value = '';
      }

      cell.value = value;
      applyStyle(cell, style);
      cell.alignment = {
        horizontal: resolveCellAlign(col),
        vertical: 'middle',
        wrapText: col.type !== 'datetime',
      };
    });
  });

  const tableEndRow =
    rows.length > 0 ? headerRowIndex + rows.length : headerRowIndex;
  sheet.autoFilter = {
    from: { row: headerRowIndex, column: 1 },
    to: { row: tableEndRow, column: colCount },
  };

  return workbook.xlsx.writeBuffer();
};

module.exports = {
  buildExcelReport,
  formatDisplayDate,
  formatDateRangeLabel,
  formatGeneratedAt,
  COLORS,
  STYLES,
  SERIAL_KEY,
};
