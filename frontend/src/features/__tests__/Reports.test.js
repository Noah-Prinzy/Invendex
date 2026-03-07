import { fireEvent, screen, waitFor } from '@testing-library/react';
import Reports from '../reports/ReportsPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  downloadInventoryReportExportJobRequest,
  downloadReportExportJobRequest,
  getAuditLogsRequest,
  getFinanceDeadStockRequest,
  getFinanceGrossMarginRequest,
  getFinanceInventoryValuationRequest,
  getInventoryReportExportJobStatusRequest,
  getReportExportJobStatusRequest,
  getWmsMovementLedgerRequest,
  queueInventoryReportExportJobRequest,
  queueReportExportJobRequest,
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendBySupplierRequest,
  getReportSpendSummaryRequest
} from '../../api/client.js';
import useOrganizationCurrency from '../../hooks/finance/useOrganizationCurrency.js';

jest.mock('../../api/client.js', () => ({
  downloadInventoryReportExportJobRequest: jest.fn(),
  downloadReportExportJobRequest: jest.fn(),
  getAuditLogsRequest: jest.fn(),
  getFinanceDeadStockRequest: jest.fn(),
  getFinanceGrossMarginRequest: jest.fn(),
  getFinanceInventoryValuationRequest: jest.fn(),
  getInventoryReportExportJobStatusRequest: jest.fn(),
  getReportExportJobStatusRequest: jest.fn(),
  getWmsMovementLedgerRequest: jest.fn(),
  queueInventoryReportExportJobRequest: jest.fn(),
  queueReportExportJobRequest: jest.fn(),
  getReportPurchaseOrderStatusSummaryRequest: jest.fn(),
  getReportSpendSummaryRequest: jest.fn(),
  getReportSpendBySupplierRequest: jest.fn()
}));

jest.mock('../../hooks/finance/useOrganizationCurrency.js', () => ({
  __esModule: true,
  default: jest.fn()
}));

describe('Reports page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useOrganizationCurrency.mockReturnValue({
      currencyCode: 'UGX',
      baseCurrencyCode: 'UGX',
      conversionRate: 1,
      formatDisplayAmount: (value) => `UGX ${Number(value || 0).toFixed(2)}`,
      isLoading: false
    });
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

    renderWithProviders(
      <Reports
        accessToken="token"
        userRole="admin"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    expect(await screen.findByText('Acme Supply')).toBeInTheDocument();
    expect(screen.getByText('Bravo Parts')).toBeInTheDocument();
    expect(getReportSpendSummaryRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      warehouseId: 'warehouse-1'
    });
    expect(getAuditLogsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        accessToken: 'token',
        warehouseId: 'warehouse-1'
      })
    );

    fireEvent.change(screen.getByPlaceholderText('Supplier name'), {
      target: { value: 'Bravo' }
    });

    await waitFor(() => {
      expect(screen.queryByText('Acme Supply')).not.toBeInTheDocument();
      expect(screen.getByText('Bravo Parts')).toBeInTheDocument();
    });
  });

  it('groups report downloads under one dropdown menu', async () => {
    getReportPurchaseOrderStatusSummaryRequest.mockResolvedValueOnce({
      draft: 1
    });
    getReportSpendSummaryRequest.mockResolvedValueOnce({
      totalSpend: 250
    });
    getReportSpendBySupplierRequest.mockResolvedValueOnce([
      { _id: 's1', supplierName: 'Acme Supply', totalSpend: 250 }
    ]);
    getFinanceInventoryValuationRequest.mockResolvedValueOnce({
      method: 'WEIGHTED_AVG',
      totalInventoryValue: 0,
      itemCount: 0,
      byProduct: []
    });
    getFinanceDeadStockRequest.mockResolvedValueOnce({
      thresholdDays: 90,
      count: 0,
      totalValue: 0,
      items: []
    });
    getFinanceGrossMarginRequest.mockResolvedValueOnce({
      groupBy: 'day',
      totals: {
        revenue: 0,
        cogs: 0,
        grossMargin: 0,
        grossMarginPct: 0
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

    renderWithProviders(
      <Reports
        accessToken="token"
        userRole="admin"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    const trigger = await screen.findByRole('button', {
      name: 'Download reports'
    });
    fireEvent.click(trigger);

    expect(screen.getByRole('menu')).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'PO status Excel' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('menuitem', { name: 'Download queued inventory export' })
    ).toBeDisabled();
  });
});
