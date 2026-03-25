const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const renderTableSection = (section) => {
  const columns = Array.isArray(section?.columns) ? section.columns : [];
  const rows = Array.isArray(section?.rows) ? section.rows : [];

  return `
    <section class="print-section">
      <h2>${escapeHtml(section?.heading || 'Section')}</h2>
      ${
        section?.description
          ? `<p class="print-description">${escapeHtml(section.description)}</p>`
          : ''
      }
      <table>
        <thead>
          <tr>${columns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}</tr>
        </thead>
        <tbody>
          ${rows
            .map(
              (row) =>
                `<tr>${row
                  .map((cell) => `<td>${escapeHtml(cell)}</td>`)
                  .join('')}</tr>`
            )
            .join('')}
        </tbody>
      </table>
    </section>
  `;
};

export const buildPrintableReportHtml = ({
  title = 'Invendex Report',
  subtitle = '',
  sections = []
} = {}) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      body {
        margin: 0;
        padding: 32px;
        font-family: "Segoe UI", Arial, sans-serif;
        color: #14263f;
        background: #f5f8fd;
      }

      .print-shell {
        max-width: 1040px;
        margin: 0 auto;
        background: #ffffff;
        border: 1px solid #d8e3f3;
        padding: 28px;
        box-sizing: border-box;
      }

      .print-header {
        margin-bottom: 24px;
        padding-bottom: 16px;
        border-bottom: 2px solid #dbe7f6;
      }

      .print-header h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }

      .print-subtitle,
      .print-meta,
      .print-description {
        margin: 0;
        color: #4f6788;
      }

      .print-meta {
        margin-top: 8px;
        font-size: 13px;
      }

      .print-section + .print-section {
        margin-top: 24px;
      }

      .print-section h2 {
        margin: 0 0 10px;
        font-size: 18px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 13px;
      }

      th,
      td {
        border: 1px solid #d8e3f3;
        padding: 8px 10px;
        text-align: left;
        vertical-align: top;
      }

      th {
        background: #eef4fc;
        color: #25456f;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        font-size: 11px;
      }

      @media print {
        body {
          background: #ffffff;
          padding: 0;
        }

        .print-shell {
          border: 0;
          padding: 0;
        }
      }
    </style>
  </head>
  <body>
    <main class="print-shell">
      <header class="print-header">
        <h1>${escapeHtml(title)}</h1>
        ${
          subtitle
            ? `<p class="print-subtitle">${escapeHtml(subtitle)}</p>`
            : ''
        }
        <p class="print-meta">Generated ${escapeHtml(
          new Date().toLocaleString()
        )}</p>
      </header>
      ${sections.map((section) => renderTableSection(section)).join('')}
    </main>
  </body>
</html>
`;

export const openPrintablePdf = ({
  title = 'Invendex Report',
  subtitle = '',
  sections = []
} = {}) => {
  if (typeof window === 'undefined') {
    return null;
  }

  const printWindow = window.open('', '_blank', 'noopener,noreferrer');
  if (!printWindow) {
    throw new Error('Unable to open printable report window');
  }

  printWindow.document.open();
  printWindow.document.write(
    buildPrintableReportHtml({
      title,
      subtitle,
      sections
    })
  );
  printWindow.document.close();
  printWindow.focus();
  printWindow.onafterprint = () => printWindow.close();

  setTimeout(() => {
    printWindow.print();
  }, 150);

  return printWindow;
};

export default {
  buildPrintableReportHtml,
  openPrintablePdf
};
