import { fireEvent, screen, waitFor } from '@testing-library/react';
import PurchaseOrders from '../purchaseOrders/PurchaseOrdersPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  createPurchaseOrderRequest,
  generatePurchaseOrdersFromAlertsRequest,
  getInventoryActiveReorderAlertsRequest,
  getProductsRequest,
  getPurchaseOrdersRequest,
  getSuppliersRequest,
  getWarehousesRequest,
  receivePurchaseOrderRequest,
  runInventoryReorderEngineRequest,
  sendPurchaseOrderRequest
} from '../../api/client.js';

vi.mock('../../api/client.js', () => ({
  closePurchaseOrderRequest: vi.fn(),
  createPurchaseOrderRequest: vi.fn(),
  generatePurchaseOrdersFromAlertsRequest: vi.fn(),
  getInventoryActiveReorderAlertsRequest: vi.fn(),
  getProductsRequest: vi.fn(),
  getPurchaseOrdersRequest: vi.fn(),
  getSuppliersRequest: vi.fn(),
  getWarehousesRequest: vi.fn(),
  receivePurchaseOrderRequest: vi.fn(),
  runInventoryReorderEngineRequest: vi.fn(),
  sendPurchaseOrderRequest: vi.fn()
}));

const seedLookups = () => {
  getSuppliersRequest.mockResolvedValue([
    {
      _id: 'supplier-1',
      name: 'Acme Supplies'
    }
  ]);

  getWarehousesRequest.mockResolvedValue([
    {
      _id: 'warehouse-1',
      code: 'MAIN',
      name: 'Main Warehouse'
    }
  ]);

  getProductsRequest.mockResolvedValue([
    {
      _id: 'product-1',
      name: 'Widget',
      sku: 'WID-001',
      uom: {
        purchase: 'box',
        purchaseToBaseFactor: 6
      }
    }
  ]);

  getInventoryActiveReorderAlertsRequest.mockResolvedValue([]);
};

describe('PurchaseOrders page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedLookups();
  });

  it('loads purchase orders and receives a SENT order with idempotency key', async () => {
    getPurchaseOrdersRequest
      .mockResolvedValueOnce([
        {
          _id: 'po-1',
          poNumber: 'PO-001',
          status: 'SENT',
          supplier: { name: 'Acme Supplies' },
          warehouse: { code: 'MAIN' },
          items: [{ product: 'product-1' }],
          updatedAt: '2026-02-26T10:00:00.000Z'
        }
      ])
      .mockResolvedValue([
        {
          _id: 'po-1',
          poNumber: 'PO-001',
          status: 'RECEIVED',
          supplier: { name: 'Acme Supplies' },
          warehouse: { code: 'MAIN' },
          items: [{ product: 'product-1' }],
          updatedAt: '2026-02-26T10:05:00.000Z'
        }
      ]);

    receivePurchaseOrderRequest.mockResolvedValue({
      _id: 'po-1',
      status: 'RECEIVED'
    });

    await renderWithProviders(
      <PurchaseOrders
        accessToken="test-token"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
        poEvents={[
          {
            id: 'event-1',
            kind: 'created',
            occurredAt: '2026-02-26T09:00:00.000Z',
            title: 'PO PO-001',
            subtitle: 'Status SENT',
            raw: {}
          }
        ]}
      />
    );

    expect(await screen.findByText('PO-001')).toBeInTheDocument();
    expect(getPurchaseOrdersRequest).toHaveBeenCalledWith({
      accessToken: 'test-token',
      warehouseId: 'warehouse-1'
    });

    fireEvent.click(screen.getByRole('button', { name: 'Receive' }));

    await waitFor(() => {
      expect(receivePurchaseOrderRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'test-token',
          purchaseOrderId: 'po-1',
          idempotencyKey: expect.any(String)
        })
      );
    });

    expect(
      await screen.findByText('Purchase order received successfully.')
    ).toBeInTheDocument();
  });

  it('creates a purchase order draft and sends it immediately', async () => {
    getPurchaseOrdersRequest.mockResolvedValue([]);
    createPurchaseOrderRequest.mockResolvedValue({
      _id: 'po-2',
      poNumber: 'PO-002'
    });
    sendPurchaseOrderRequest.mockResolvedValue({
      _id: 'po-2',
      status: 'SENT'
    });

    await renderWithProviders(
      <PurchaseOrders
        accessToken="test-token"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
        poEvents={[]}
      />
    );

    expect(
      await screen.findByText('Create purchase order')
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Supplier'), {
      target: { value: 'supplier-1' }
    });
    fireEvent.change(screen.getByLabelText('Warehouse'), {
      target: { value: 'warehouse-1' }
    });
    fireEvent.change(screen.getByLabelText('Product'), {
      target: { value: 'product-1' }
    });
    fireEvent.change(screen.getByLabelText('Quantity'), {
      target: { value: '2' }
    });
    fireEvent.change(screen.getByLabelText('Unit cost'), {
      target: { value: '12.50' }
    });

    fireEvent.click(screen.getByRole('button', { name: 'Add line item' }));

    expect(await screen.findByText('WID-001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Save and send' }));

    await waitFor(() => {
      expect(createPurchaseOrderRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'test-token',
          supplier: 'supplier-1',
          warehouse: 'warehouse-1',
          items: [
            expect.objectContaining({
              product: 'product-1',
              sku: 'WID-001',
              quantity: 2,
              unitCost: 12.5,
              purchaseUom: 'box',
              purchaseToBaseFactor: 6
            })
          ]
        })
      );
    });

    await waitFor(() => {
      expect(sendPurchaseOrderRequest).toHaveBeenCalledWith({
        accessToken: 'test-token',
        purchaseOrderId: 'po-2'
      });
    });

    expect(
      await screen.findByText('Purchase order created and sent to supplier.')
    ).toBeInTheDocument();
  });

  it('runs reorder automation and generates draft purchase orders from alerts', async () => {
    getPurchaseOrdersRequest.mockResolvedValue([]);
    getInventoryActiveReorderAlertsRequest
      .mockResolvedValueOnce([
        {
          _id: 'alert-1',
          sku: 'WID-001',
          stock: 1,
          reorderQuantity: 12,
          supplierUnitCost: 10,
          triggeredAt: '2026-02-26T09:15:00.000Z',
          product: { sku: 'WID-001', name: 'Widget' },
          supplier: { name: 'Acme Supplies' },
          warehouse: { code: 'MAIN' }
        }
      ])
      .mockResolvedValue([
        {
          _id: 'alert-1',
          sku: 'WID-001',
          stock: 1,
          reorderQuantity: 12,
          supplierUnitCost: 10,
          triggeredAt: '2026-02-26T09:15:00.000Z',
          product: { sku: 'WID-001', name: 'Widget' },
          supplier: { name: 'Acme Supplies' },
          warehouse: { code: 'MAIN' }
        }
      ]);
    runInventoryReorderEngineRequest.mockResolvedValue({
      generated: 1,
      alerts: [{ _id: 'alert-1' }]
    });
    generatePurchaseOrdersFromAlertsRequest.mockResolvedValue({
      created: 1,
      orders: [{ _id: 'po-3' }]
    });

    await renderWithProviders(
      <PurchaseOrders
        accessToken="test-token"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
        poEvents={[]}
      />
    );

    expect(await screen.findByText('Reorder automation')).toBeInTheDocument();
    expect(await screen.findByText('WID-001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run reorder engine' }));

    await waitFor(() => {
      expect(runInventoryReorderEngineRequest).toHaveBeenCalledWith({
        accessToken: 'test-token'
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Generate drafts' }));

    await waitFor(() => {
      expect(generatePurchaseOrdersFromAlertsRequest).toHaveBeenCalledWith({
        accessToken: 'test-token',
        warehouse: 'warehouse-1',
        autoSend: false
      });
    });

    expect(
      await screen.findByText(
        'Generated 1 draft purchase order(s) from active alerts.'
      )
    ).toBeInTheDocument();
  });
});
