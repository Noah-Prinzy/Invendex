export const sanitizeCsvCell = (value) => {
  let normalized = String(value ?? '');
  if (/^[=+\-@]/.test(normalized)) {
    normalized = `'${normalized}`;
  }
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
};

export const toCsv = (headers = [], rows = []) => {
  const headerLine = headers.map(sanitizeCsvCell).join(',');
  const bodyLines = rows.map((row) =>
    row.map((value) => sanitizeCsvCell(value)).join(',')
  );
  return [headerLine, ...bodyLines].join('\n');
};

export const buildExportFileName = (prefix, extension) => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `invendex-${String(prefix || 'report').trim()}-${stamp}.${String(
    extension || 'txt'
  ).trim()}`;
};

export const downloadBlobFile = ({ blob, fileName }) => {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};

export const downloadTextFile = ({
  fileName,
  content,
  mimeType = 'text/plain;charset=utf-8'
}) => {
  downloadBlobFile({
    blob: new Blob([content], { type: mimeType }),
    fileName
  });
};

export const downloadCsvFile = ({ prefix, headers, rows }) => {
  downloadTextFile({
    fileName: buildExportFileName(prefix, 'csv'),
    content: toCsv(headers, rows),
    mimeType: 'text/csv;charset=utf-8'
  });
};

export default {
  sanitizeCsvCell,
  toCsv,
  buildExportFileName,
  downloadBlobFile,
  downloadTextFile,
  downloadCsvFile
};
