import PDFDocument from 'pdfkit';

const DEFAULT_PAGE_MARGIN = 50;
const DEFAULT_ROW_HEIGHT = 20;

const ensurePageSpace = (document, height = DEFAULT_ROW_HEIGHT) => {
  const pageBottom = document.page.height - document.page.margins.bottom;
  if (document.y + height > pageBottom) {
    document.addPage();
  }
};

const drawTable = (document, { columns = [], rows = [] }) => {
  const safeColumns = Array.isArray(columns) ? columns : [];
  if (!safeColumns.length) return;

  const safeRows = Array.isArray(rows) ? rows : [];
  const startX = document.page.margins.left;
  const widths = safeColumns.map((column) => Number(column.width || 120));

  ensurePageSpace(document, DEFAULT_ROW_HEIGHT + 8);
  document.font('Helvetica-Bold').fontSize(10);
  let x = startX;
  for (let idx = 0; idx < safeColumns.length; idx += 1) {
    const column = safeColumns[idx];
    document.text(String(column.label || ''), x, document.y, {
      width: widths[idx],
      align: column.align || 'left'
    });
    x += widths[idx];
  }

  document.moveDown(0.4);
  document.font('Helvetica').fontSize(10);

  for (const row of safeRows) {
    ensurePageSpace(document, DEFAULT_ROW_HEIGHT + 2);
    x = startX;
    const rowY = document.y;

    for (let idx = 0; idx < safeColumns.length; idx += 1) {
      const column = safeColumns[idx];
      const value = row?.[column.key];
      document.text(String(value ?? ''), x, rowY, {
        width: widths[idx],
        align: column.align || 'left'
      });
      x += widths[idx];
    }

    document.moveDown(0.6);
  }
};

export const toPdfBuffer = ({
  title = 'Ledgerly Report',
  subtitle = '',
  sections = []
} = {}) =>
  new Promise((resolve, reject) => {
    const document = new PDFDocument({
      margin: DEFAULT_PAGE_MARGIN,
      size: 'A4'
    });
    const chunks = [];

    document.on('data', (chunk) => chunks.push(chunk));
    document.on('end', () => resolve(Buffer.concat(chunks)));
    document.on('error', reject);

    document
      .font('Helvetica-Bold')
      .fontSize(18)
      .text(String(title || 'Report'));

    if (String(subtitle || '').trim()) {
      document
        .moveDown(0.4)
        .font('Helvetica')
        .fontSize(10)
        .fillColor('#555')
        .text(String(subtitle));
      document.fillColor('#000');
    }

    for (const section of Array.isArray(sections) ? sections : []) {
      const heading = String(section?.heading || '').trim();
      const rows = Array.isArray(section?.rows) ? section.rows : [];
      const columns = Array.isArray(section?.columns) ? section.columns : [];

      if (!heading && !rows.length) {
        continue;
      }

      ensurePageSpace(document, 40);
      document.moveDown(0.8);

      if (heading) {
        document.font('Helvetica-Bold').fontSize(12).text(heading);
        document.moveDown(0.35);
      }

      if (columns.length) {
        drawTable(document, { columns, rows });
      } else {
        document.font('Helvetica').fontSize(10);
        for (const row of rows) {
          ensurePageSpace(document, 18);
          document.text(String(row ?? ''));
        }
      }

      if (String(section?.note || '').trim()) {
        ensurePageSpace(document, 22);
        document
          .moveDown(0.3)
          .font('Helvetica-Oblique')
          .fontSize(9)
          .fillColor('#666')
          .text(String(section.note));
        document.fillColor('#000').font('Helvetica').fontSize(10);
      }
    }

    document.end();
  });

export default {
  toPdfBuffer
};
