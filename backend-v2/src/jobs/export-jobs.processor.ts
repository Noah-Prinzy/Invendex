import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';
import { JOBS_QUEUE } from '../events/domain-event.types';

/**
 * Heavy dependencies (xlsx, pdfkit, bwip-js) are imported lazily inside the
 * handlers so they only ever load in the worker process — never in the API.
 */
@Processor(JOBS_QUEUE)
export class ExportJobsProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportJobsProcessor.name);

  async process(job: Job): Promise<unknown> {
    this.logger.log(`Processing job '${job.name}' (${job.id})`);
    switch (job.name) {
      case 'reports.export.xlsx':
        return this.exportXlsx(job as Job<{ title?: string; rows?: unknown[][] }>);
      case 'reports.export.pdf':
        return this.exportPdf(job as Job<{ title?: string; lines?: string[] }>);
      case 'labels.barcode':
        return this.renderBarcodeLabels(job as Job<{ barcodes?: string[] }>);
      default:
        throw new Error(`Unknown job '${job.name}'`);
    }
  }

  private async exportXlsx(job: Job<{ title?: string; rows?: unknown[][] }>) {
    const xlsx = await import('xlsx');
    const workbook = xlsx.utils.book_new();
    const sheet = xlsx.utils.aoa_to_sheet([
      ['title', job.data.title ?? 'report'],
      ...(job.data.rows ?? [])
    ]);
    xlsx.utils.book_append_sheet(workbook, sheet, 'Sheet1');
    const buffer = xlsx.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx'
    }) as Buffer;
    return { fileName: `${job.data.title ?? 'report'}.xlsx`, bytes: buffer.length };
  }

  private async exportPdf(job: Job<{ title?: string; lines?: string[] }>) {
    const PDFDocument = (await import('pdfkit')).default;
    const doc = new PDFDocument();
    doc.text(job.data.title ?? 'Report');
    for (const line of job.data.lines ?? []) doc.text(line);
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const done = new Promise<Buffer>((resolve) =>
      doc.on('end', () => resolve(Buffer.concat(chunks)))
    );
    doc.end();
    const buffer = await done;
    return { fileName: `${job.data.title ?? 'report'}.pdf`, bytes: buffer.length };
  }

  private async renderBarcodeLabels(job: Job<{ barcodes?: string[] }>) {
    const bwipjs = await import('bwip-js');
    const labels = job.data.barcodes ?? [];
    for (const value of labels) {
      // PNG label per barcode value; real layout/thermal sizing in the
      // implementation phase.
      await bwipjs.toBuffer({ bcid: 'code128', text: value, scale: 3 });
    }
    return { labels: labels.length };
  }
}
