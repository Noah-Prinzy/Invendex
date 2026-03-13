import { screen, waitFor } from '@testing-library/react';
import Dashboard from '../dashboard/DashboardPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  getProductsHealthScoreRequest,
  getProductsLowStockSummaryRequest,
  getProductsRequest,
  getWmsBinMovementsRequest,
  getWmsBinInventoryRequest,
  getAiDemandAnomaliesRequest,
  getAiSupplierReliabilityRequest,
  getDashboardDeadStockRequest,
  getDashboardDeadStockRescueRequest,
  getDashboardDigitalTwinRequest,
  getDashboardInventoryAdvisorRequest,
  getDashboardSlowMovingSkusRequest,
  getDashboardStockAgingBucketsRequest,
  getDashboardSupplierRankingRequest,
  getDashboardTopSellingItemsRequest,
  getDashboardTurnoverSkusRequest
} from '../../api/client.js';

vi.mock('../../api/client.js', () => ({
  getProductsHealthScoreRequest: vi.fn(),
  getProductsLowStockSummaryRequest: vi.fn(),
  getProductsRequest: vi.fn(),
  getWmsBinMovementsRequest: vi.fn(),
  getWmsBinInventoryRequest: vi.fn(),
  getAiDemandAnomaliesRequest: vi.fn(),
  getAiSupplierReliabilityRequest: vi.fn(),
  getDashboardDeadStockRequest: vi.fn(),
  getDashboardDeadStockRescueRequest: vi.fn(),
  getDashboardDigitalTwinRequest: vi.fn(),
  getDashboardInventoryAdvisorRequest: vi.fn(),
  getDashboardSlowMovingSkusRequest: vi.fn(),
  getDashboardStockAgingBucketsRequest: vi.fn(),
  getDashboardSupplierRankingRequest: vi.fn(),
  getDashboardTopSellingItemsRequest: vi.fn(),
  getDashboardTurnoverSkusRequest: vi.fn()
}));

describe('Dashboard page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProductsRequest.mockResolvedValue([
      {
        _id: 'p1',
        sku: 'SKU-001',
        name: 'Widget One',
        stock: 12,
        price: 10
      }
    ]);
    getProductsLowStockSummaryRequest.mockResolvedValue([{ sku: 'SKU-001' }]);
    getProductsHealthScoreRequest.mockResolvedValue({
      score: 91,
      band: 'EXCELLENT'
    });
    getDashboardTopSellingItemsRequest.mockResolvedValue([
      {
        productId: 'p1',
        sku: 'SKU-001',
        name: 'Widget One',
        quantitySold: 22
      }
    ]);
    getDashboardTurnoverSkusRequest.mockResolvedValue([
      {
        productId: 'p1',
        sku: 'SKU-001',
        turnoverRatio: 2.4
      }
    ]);
    getDashboardSlowMovingSkusRequest.mockResolvedValue([
      {
        productId: 'p2',
        sku: 'SKU-002',
        velocityPerDay: 0.2
      }
    ]);
    getDashboardStockAgingBucketsRequest.mockResolvedValue({
      summary: {
        bucket0to30: { skuCount: 2, quantity: 20 },
        bucket31to60: { skuCount: 1, quantity: 5 },
        bucket61to90: { skuCount: 1, quantity: 4 },
        bucket90plus: { skuCount: 1, quantity: 3 }
      }
    });
    getDashboardSupplierRankingRequest.mockResolvedValue([
      {
        supplierId: 's1',
        supplierName: 'Acme Supplies',
        score: 88.1,
        onTimeRate: 92.5,
        avgLeadTimeDays: 3.6
      }
    ]);
    getDashboardDeadStockRequest.mockResolvedValue({
      items: [
        {
          productId: 'p3',
          sku: 'SKU-003',
          warehouseCode: 'WH-1',
          ageDays: 101,
          quantityOnHand: 8
        }
      ],
      count: 1,
      totalValue: 100,
      thresholdDays: 90
    });
    getDashboardInventoryAdvisorRequest.mockResolvedValue({
      totals: {
        recommendations: 1
      },
      recommendations: [
        {
          id: 'advisor-1',
          priority: 'high',
          sku: 'SKU-001',
          recommendation: 'Reduce next reorder quantity by 20%.'
        }
      ]
    });
    getDashboardDeadStockRescueRequest.mockResolvedValue({
      totals: {
        items: 1
      },
      actions: [
        {
          productId: 'p3',
          sku: 'SKU-003',
          warehouseCode: 'WH-1',
          recommendedAction: 'DISCOUNT_AND_REPOSITION',
          suggestedDiscountPct: 22,
          estimatedRecoverableValue: 78
        }
      ]
    });
    getDashboardDigitalTwinRequest.mockResolvedValue({
      totals: {
        warehouses: 1,
        zones: 2,
        bins: 3
      },
      warehouses: [
        {
          warehouseId: 'w1',
          warehouseCode: 'WH-1',
          totals: {
            quantityOnHand: 40,
            quantityBinned: 30,
            quantityUnbinned: 10
          },
          zones: [
            { zone: 'A', totals: { bins: 2 } },
            { zone: 'B', totals: { bins: 1 } }
          ]
        }
      ]
    });
    getAiSupplierReliabilityRequest.mockResolvedValue([
      {
        supplierId: 's1',
        supplierName: 'Acme Supplies',
        score: 91.4
      }
    ]);
    getAiDemandAnomaliesRequest.mockResolvedValue({
      productId: 'p1',
      anomalyCount: 1,
      anomalies: [
        {
          date: '2026-02-20',
          demand: 20,
          zScore: 3.1,
          severity: 'HIGH'
        }
      ],
      status: 'anomalies_detected'
    });
    getWmsBinInventoryRequest.mockResolvedValue({
      bin: {
        binId: 'b1',
        code: 'A-01'
      },
      totals: {
        lines: 1,
        quantityOnHand: 6,
        quantityReserved: 1,
        quantityAvailable: 5,
        inventoryValue: 42
      },
      items: [
        {
          inventoryId: 'i1',
          sku: 'SKU-001',
          productName: 'Widget One',
          unitPrice: 7,
          quantityOnHand: 6,
          quantityReserved: 1,
          quantityAvailable: 5
        }
      ]
    });
    getWmsBinMovementsRequest.mockResolvedValue({
      bin: {
        binId: 'b1',
        code: 'A-01'
      },
      totals: {
        count: 1,
        quantity: 3,
        inboundQuantity: 3,
        outboundQuantity: 0,
        byType: {
          TRANSFER: 1
        }
      },
      movements: [
        {
          movementId: 'm1',
          movedAt: '2026-02-20T10:30:00.000Z',
          movementType: 'TRANSFER',
          direction: 'IN',
          sku: 'SKU-001',
          quantity: 3,
          binFromCode: 'STOR-01',
          binToCode: 'A-01'
        }
      ]
    });
  });

  it('renders dashboard intelligence blocks with API data', async () => {
    await renderWithProviders(
      <Dashboard
        accessToken="token"
        warehouseId="WH-1"
        inventoryEvents={[]}
        financeEvents={[]}
        authEvents={[]}
      />
    );

    await waitFor(() => {
      expect(getDashboardTopSellingItemsRequest).toHaveBeenCalled();
    });

    expect(await screen.findByText('Widget One')).toBeInTheDocument();
    const supplierHits = await screen.findAllByText('Acme Supplies');
    expect(supplierHits.length).toBeGreaterThan(0);
    expect(screen.getByText('Products in scope')).toBeInTheDocument();
    expect(screen.getByText('Inventory health')).toBeInTheDocument();
    expect(screen.getByText('Dead stock value')).toBeInTheDocument();
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    expect(screen.getByText('91.0 / 100')).toBeInTheDocument();
    expect(screen.getByText('EXCELLENT')).toBeInTheDocument();
    expect(screen.getByText('Stock Aging Buckets')).toBeInTheDocument();
    expect(screen.getByText('Dead Stock (90d)')).toBeInTheDocument();
    expect(screen.getByText('AI Inventory Advisor')).toBeInTheDocument();
    expect(screen.getByText('Dead Stock Rescue Actions')).toBeInTheDocument();
    expect(screen.getByText('Warehouse Digital Twin')).toBeInTheDocument();
    expect(screen.getByText('AI Supplier Reliability')).toBeInTheDocument();
    expect(screen.getByText('AI Demand Anomalies')).toBeInTheDocument();
    expect(await screen.findByText(/z=3\.10/i)).toBeInTheDocument();
    expect(getDashboardTopSellingItemsRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      days: 30,
      limit: 8,
      warehouseId: 'WH-1'
    });
    expect(getProductsRequest).toHaveBeenCalledWith('token', {
      warehouseId: 'WH-1'
    });
    expect(getProductsLowStockSummaryRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      warehouseId: 'WH-1'
    });
    expect(getProductsHealthScoreRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      warehouseId: 'WH-1'
    });
    expect(getAiSupplierReliabilityRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      days: 180,
      warehouseId: 'WH-1'
    });
  });
});
