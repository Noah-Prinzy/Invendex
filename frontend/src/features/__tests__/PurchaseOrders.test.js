import { fireEvent, screen, waitFor } from '@testing-library/react';
import PurchaseOrders from '../purchaseOrders/PurchaseOrdersPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  getPurchaseOrdersRequest,
  receivePurchaseOrderRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  getPurchaseOrdersRequest: jest.fn(),
  receivePurchaseOrderRequest: jest.fn()
}));

describe('PurchaseOrders page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
          items: [{ product: 'p-1' }],
          updatedAt: '2026-02-26T10:00:00.000Z'
        }
      ])
      .mockResolvedValueOnce([
        {
          _id: 'po-1',
          poNumber: 'PO-001',
          status: 'RECEIVED',
          supplier: { name: 'Acme Supplies' },
          warehouse: { code: 'MAIN' },
          items: [{ product: 'p-1' }],
          updatedAt: '2026-02-26T10:05:00.000Z'
        }
      ]);

    receivePurchaseOrderRequest.mockResolvedValue({
      _id: 'po-1',
      status: 'RECEIVED'
    });

    renderWithProviders(
      <PurchaseOrders
        accessToken="test-token"
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
});
