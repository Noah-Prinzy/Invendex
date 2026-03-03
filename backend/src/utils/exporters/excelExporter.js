import XLSX from 'xlsx';

export const toExcelBuffer = (rows = [], sheetName = 'Report') => {
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

export const toExcelBufferFromSheets = (sheets = {}) => {
  const workbook = XLSX.utils.book_new();
  const entries = Object.entries(sheets || {});

  if (!entries.length) {
    const emptySheet = XLSX.utils.json_to_sheet([]);
    XLSX.utils.book_append_sheet(workbook, emptySheet, 'Report');
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  for (const [sheetName, rows] of entries) {
    const safeName = String(sheetName || 'Report').slice(0, 31);
    const worksheet = XLSX.utils.json_to_sheet(Array.isArray(rows) ? rows : []);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName);
  }

  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

export default {
  toExcelBuffer,
  toExcelBufferFromSheets
};
