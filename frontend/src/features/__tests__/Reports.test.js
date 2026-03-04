import { fireEvent, screen, waitFor } from '@testing-library/react';
import Reports from '../reports/ReportsPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  downloadInventoryReportExportJobRequest,
  downloadReportExportJobRequest,
  getAuditLogsRequest,
  getFinanceExchangeRatesRequest,
  getFinanceDeadStockRequest,
  getFinanceGrossMarginRequest,
  getFinanceInventoryValuationRequest,
  getInventoryReportExportJobStatusRequest,
  getReportExportJobStatusRequest,
  getSettingsRequest,
  getWmsMovementLedgerRequest,
  queueInventoryReportExportJobRequest,
  queueReportExportJobRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendBySupplierRequest,
  getReportSpendSummaryRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  downloadInventoryReportExportJobRequest: jest.fn(),
  downloadReportExportJobRequest: jest.fn(),
  getAuditLogsRequest: jest.fn(),
  getFinanceExchangeRatesRequest: jest.fn(),
  getFinanceDeadStockRequest: jest.fn(),
  getFinanceGrossMarginRequest: jest.fn(),
  getFinanceInventoryValuationRequest: jest.fn(),
  getInventoryReportExportJobStatusRequest: jest.fn(),
  getReportExportJobStatusRequest: jest.fn(),
  getSettingsRequest: jest.fn(),
  getWmsMovementLedgerRequest: jest.fn(),
  queueInventoryReportExportJobRequest: jest.fn(),
  queueReportExportJobRequest: jest.fn(),
  getReportPurchaseOrderStatusSummaryRequest: jest.fn(),
  getReportSpendSummaryRequest: jest.fn(),
  getReportSpendBySupplierRequest: jest.fn()
}));

describe('Reports page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queueInventoryReportExportJobRequest.mockResolvedValue(null);
    getInventoryReportExportJobStatusRequest.mockResolvedValue(null);
    downloadInventoryReportExportJobRequest.mockResolvedValue({
      blob: new Blob(['test'], { type: 'text/csv' }),
      fileName: 'inventory-report.csv',
      contentType: 'text/csv'
    });
    queueReportExportJobRequest.mockResolvedValue({
      id: 'report-job-1',
      status: 'COMPLETED',
      progress: { percent: 100 }
    });
    getReportExportJobStatusRequest.mockResolvedValue({
      id: 'report-job-1',
      status: 'COMPLETED',
      progress: { percent: 100 }
    });
    downloadReportExportJobRequest.mockResolvedValue({
      blob: new Blob(['report'], { type: 'application/octet-stream' }),
      fileName: 'report.xlsx',
      contentType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
  });

  it('shows permission gate for non-admin users', () => {
    renderWithProviders(<Reports accessToken="token" userRole="staff" />);

    expect(screen.getByText('Admin role needed')).toBeInTheDocument();
    expect(getReportSpendSummaryRequest).not.toHaveBeenCalled();
  });

  it('loads spend rows and supports search filtering', async () => {
    getSettingsRequest.mockResolvedValueOnce({
      companyProfile: {
        currencyCode: 'UGX'
      }
    });
    getFinanceExchangeRatesRequest.mockResolvedValueOnce({
      baseCurrencyCode: 'UGX',
      rates: [
        {
          quoteCurrencyCode: 'USD',
          rate: 0.00027
        }
      ]
    });
    getReportPurchaseOrderStatusSummaryRequest.mockResolvedValueOnce({
      draft: 2,
      sent: 1
    });
    getReportSpendSummaryRequest.mockResolvedValueOnce({
      totalSpend: 1000
    });
    getReportSpendBySupplierRequest.mockResolvedValueOnce([
      { _id: 's1', supplierName: 'Acme Supply', totalSpend: 700 },
      { _id: 's2', supplierName: 'Bravo Parts', totalSpend: 300 }
    ]);
    getFinanceInventoryValuationRequest.mockResolvedValueOnce({
      method: 'WEIGHTED_AVG',
      totalInventoryValue: 5000,
      itemCount: 4,
      byProduct: [
        {
          productName: 'Product A',
          sku: 'SKU-A',
          warehouseCode: 'WH-1',
          quantityOnHand: 10,
          unitCost: 12,
          value: 120
        }
      ]
    });
    getFinanceDeadStockRequest.mockResolvedValueOnce({
      thresholdDays: 90,
      count: 1,
      totalValue: 85,
      items: [
        {
          productId: 'p1',
          sku: 'SKU-A',
          productName: 'Product A',
          warehouseId: 'w1',
          warehouseCode: 'WH-1',
          quantityOnHand: 5,
          inventoryValue: 85,
          ageDays: 123
        }
      ]
    });
    getFinanceGrossMarginRequest.mockResolvedValueOnce({
      groupBy: 'day',
      totals: {
        revenue: 1000,
        cogs: 640,
        grossMargin: 360,
        grossMarginPct: 36
      },
      items: []
    });
    getWmsMovementLedgerRequest.mockResolvedValueOnce([]);
    getAuditLogsRequest.mockResolvedValueOnce({
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 50,
        pages: 0
      }
    });

    renderWithProviders(<Reports accessToken="token" userRole="admin" />);

    expect(await screen.findByText('Acme Supply')).toBeInTheDocument();
    expect(screen.getByText('Bravo Parts')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Supplier name'), {
      target: { value: 'Bravo' }
    });

    await waitFor(() => {
      expect(screen.queryByText('Acme Supply')).not.toBeInTheDocument();
      expect(screen.getByText('Bravo Parts')).toBeInTheDocument();
    });
  });
});
