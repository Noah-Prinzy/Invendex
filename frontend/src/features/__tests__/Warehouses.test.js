import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import Warehouses from '../warehouses/WarehousesPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  allocateWmsBinStockRequest,
  approveInventoryStocktakeSessionRequest,
  completeWmsPickTicketRequest,
  createInventoryStocktakeSessionRequest,
  createWmsBinRequest,
  createWmsPickTicketRequest,
  getInventoryStocktakeSessionRequest,
  getProductsRequest,
  getUsersRequest,
  getWarehousesRequest,
  getWmsMovementLedgerRequest,
  getWmsBinInventoryRequest,
  getWmsBinMovementsRequest,
  getWmsBinsRequest,
  getWmsReplenishmentRequest,
  getWmsWarehouseTransfersRequest,
  listInventoryStocktakesRequest,
  startWmsPickTicketRequest,
  submitInventoryStocktakeCountsRequest,
  transferWmsBinStockRequest,
  transferWmsWarehouseStockRequest,
  updateWmsBinRulesRequest
} from '../../api/client.js';

vi.mock('../../api/client.js', () => ({
  allocateWmsBinStockRequest: vi.fn(),
  approveInventoryStocktakeSessionRequest: vi.fn(),
  archiveWarehouseRequest: vi.fn(),
  completeWmsPickTicketRequest: vi.fn(),
  createInventoryStocktakeSessionRequest: vi.fn(),
  createWmsBinRequest: vi.fn(),
  createWmsPickTicketRequest: vi.fn(),
  getInventoryStocktakeSessionRequest: vi.fn(),
  createWarehouseRequest: vi.fn(),
  getProductsRequest: vi.fn(),
  getUsersRequest: vi.fn(),
  getWarehousesRequest: vi.fn(),
  getWmsMovementLedgerRequest: vi.fn(),
  getWmsBinInventoryRequest: vi.fn(),
  getWmsBinMovementsRequest: vi.fn(),
  getWmsBinsRequest: vi.fn(),
  getWmsReplenishmentRequest: vi.fn(),
  getWmsWarehouseTransfersRequest: vi.fn(),
  listInventoryStocktakesRequest: vi.fn(),
  restoreWarehouseRequest: vi.fn(),
  startWmsPickTicketRequest: vi.fn(),
  submitInventoryStocktakeCountsRequest: vi.fn(),
  transferWmsBinStockRequest: vi.fn(),
  transferWmsWarehouseStockRequest: vi.fn(),
  updateWmsBinRulesRequest: vi.fn(),
  updateWarehouseRequest: vi.fn()
}));

const seedWarehouseQueries = () => {
  getWarehousesRequest.mockResolvedValue([
    {
      _id: 'warehouse-1',
      code: 'MAIN',
      name: 'Main Warehouse',
      region: 'Kampala',
      isActive: true,
      isArchived: false
    },
    {
      _id: 'warehouse-2',
      code: 'EAST',
      name: 'Eastern Depot',
      region: 'Jinja',
      isActive: true,
      isArchived: false
    }
  ]);

  getProductsRequest.mockResolvedValue([
    {
      _id: 'product-1',
      name: 'Widget',
      sku: 'WID-001'
    }
  ]);

  getWmsBinsRequest.mockResolvedValue([
    {
      _id: 'bin-1',
      code: 'A-01',
      zone: 'Fast movers',
      binType: 'PICK_FACE',
      maxCapacityUnits: 24,
      replenishmentMinUnits: 2,
      replenishmentTargetUnits: 6,
      isActive: true
    },
    {
      _id: 'bin-2',
      code: 'B-01',
      zone: 'Reserve',
      binType: 'STORAGE',
      isActive: true
    }
  ]);
  getWmsBinInventoryRequest.mockResolvedValue({
    totals: {
      lines: 1,
      quantityOnHand: 12,
      quantityReserved: 2,
      quantityAvailable: 10
    },
    items: [
      {
        inventoryId: 'inv-1',
        productId: 'product-1',
        productName: 'Widget',
        sku: 'WID-001',
        quantityOnHand: 12,
        quantityReserved: 2,
        quantityAvailable: 10,
        updatedAt: '2026-03-20T08:00:00.000Z'
      }
    ]
  });
  getWmsBinMovementsRequest.mockResolvedValue({
    totals: {
      count: 1,
      inboundQuantity: 12,
      outboundQuantity: 0
    },
    movements: [
      {
        movementId: 'move-1',
        movedAt: '2026-03-20T08:00:00.000Z',
        movementType: 'ALLOCATION',
        direction: 'IN',
        productName: 'Widget',
        sku: 'WID-001',
        quantity: 12,
        binFromCode: null,
        binToCode: 'A-01',
        reason: 'Initial slotting'
      }
    ]
  });
  getWmsReplenishmentRequest.mockResolvedValue({
    count: 1,
    recommendations: [
      {
        productId: 'product-1',
        productName: 'Widget',
        sku: 'WID-001',
        targetBinId: 'bin-1',
        targetBinCode: 'A-01',
        currentAvailable: 1,
        neededQuantity: 4,
        shortfall: 0,
        suggestedSources: [{ binId: 'bin-2', binCode: 'B-01', quantity: 4 }]
      }
    ]
  });
  getWmsMovementLedgerRequest.mockResolvedValue([
    {
      _id: 'movement-1',
      movedAt: '2026-03-21T06:45:00.000Z',
      movementType: 'TRANSFER',
      quantity: 7,
      referenceType: 'MANUAL',
      referenceId: 'manual-1',
      reason: 'Shifted to reserve',
      product: {
        _id: 'product-1',
        name: 'Widget',
        sku: 'WID-001'
      },
      warehouseFrom: {
        _id: 'warehouse-1',
        code: 'MAIN'
      },
      warehouseTo: {
        _id: 'warehouse-1',
        code: 'MAIN'
      },
      binFrom: {
        _id: 'bin-1',
        code: 'A-01'
      },
      binTo: {
        _id: 'bin-2',
        code: 'B-01'
      }
    }
  ]);
  listInventoryStocktakesRequest.mockResolvedValue([
    {
      _id: 'stocktake-1',
      title: 'Morning cycle count',
      status: 'OPEN',
      countedLines: 1,
      totalLines: 3,
      varianceLines: 0,
      updatedAt: '2026-03-21T08:00:00.000Z'
    }
  ]);
  getInventoryStocktakeSessionRequest.mockResolvedValue({
    _id: 'stocktake-1',
    title: 'Morning cycle count',
    status: 'OPEN',
    createdAt: '2026-03-21T07:00:00.000Z',
    lines: [
      {
        product: {
          _id: 'product-1'
        },
        sku: 'WID-001',
        productName: 'Widget',
        expectedQuantity: 3,
        countedQuantity: null,
        variance: 0
      }
    ]
  });
  getWmsWarehouseTransfersRequest.mockResolvedValue([]);
  getUsersRequest.mockResolvedValue([]);
};

describe('Warehouses page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedWarehouseQueries();
  });

  it('shows a permission gate for staff users', async () => {
    await renderWithProviders(
      <Warehouses accessToken="token" userRole="staff" />
    );

    expect(
      screen.getByText('Manager, admin, or owner role needed')
    ).toBeInTheDocument();
    expect(getWarehousesRequest).not.toHaveBeenCalled();
    expect(getProductsRequest).not.toHaveBeenCalled();
  });

  it('lets managers transfer stock without exposing warehouse setup controls', async () => {
    transferWmsWarehouseStockRequest.mockResolvedValue({
      transfer: { _id: 'transfer-1' }
    });

    await renderWithProviders(
      <Warehouses
        accessToken="token"
        userRole="manager"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Warehouse transfer' })
    ).toBeInTheDocument();
    expect(screen.queryByText('Create warehouse')).not.toBeInTheDocument();
    expect(getUsersRequest).not.toHaveBeenCalled();

    const warehouseTransferCard = screen
      .getByRole('heading', { name: 'Warehouse transfer' })
      .closest('article');
    const warehouseTransferScope = within(warehouseTransferCard);

    fireEvent.change(warehouseTransferScope.getByLabelText('Product'), {
      target: { value: 'product-1' }
    });
    fireEvent.change(warehouseTransferScope.getByLabelText('From warehouse'), {
      target: { value: 'warehouse-1' }
    });
    fireEvent.change(warehouseTransferScope.getByLabelText('To warehouse'), {
      target: { value: 'warehouse-2' }
    });
    fireEvent.change(warehouseTransferScope.getByLabelText('Quantity'), {
      target: { value: '5' }
    });
    fireEvent.change(
      warehouseTransferScope.getByPlaceholderText('Balance overflow stock'),
      {
        target: { value: 'Rebalance demand' }
      }
    );

    fireEvent.click(
      warehouseTransferScope.getByRole('button', { name: 'Transfer stock' })
    );

    await waitFor(() => {
      expect(transferWmsWarehouseStockRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        productId: 'product-1',
        fromWarehouseId: 'warehouse-1',
        toWarehouseId: 'warehouse-2',
        quantity: 5,
        reason: 'Rebalance demand',
        notes: '',
        idempotencyKey: expect.any(String)
      });
    });

    expect(
      await screen.findByText(/Transferred 5 unit\(s\) of Widget/)
    ).toBeInTheDocument();
    expect(getWmsWarehouseTransfersRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      warehouseId: 'warehouse-1',
      limit: 25
    });
  });

  it('supports creating bins and allocating stock inside the selected warehouse', async () => {
    createWmsBinRequest.mockResolvedValue({
      _id: 'bin-3',
      code: 'C-01',
      zone: 'Overflow'
    });
    allocateWmsBinStockRequest.mockResolvedValue({
      _id: 'alloc-1'
    });
    transferWmsBinStockRequest.mockResolvedValue({
      _id: 'move-2'
    });

    await renderWithProviders(
      <Warehouses
        accessToken="token"
        userRole="manager"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Bin operations' })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('A-01'), {
      target: { value: 'C-01' }
    });
    fireEvent.change(screen.getByPlaceholderText('Fast movers'), {
      target: { value: 'Overflow' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create bin' }));

    await waitFor(() => {
      expect(createWmsBinRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          accessToken: 'token',
          warehouseId: 'warehouse-1',
          code: 'C-01',
          zone: 'Overflow'
        })
      );
    });

    fireEvent.change(screen.getByLabelText('Allocation bin'), {
      target: { value: 'bin-1' }
    });
    fireEvent.change(screen.getByLabelText('Allocation product'), {
      target: { value: 'product-1' }
    });
    fireEvent.change(screen.getByLabelText('Allocation quantity'), {
      target: { value: '4' }
    });
    fireEvent.change(screen.getByPlaceholderText('Initial slotting'), {
      target: { value: 'Re-slot top seller' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Allocate to bin' }));

    await waitFor(() => {
      expect(allocateWmsBinStockRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        warehouseId: 'warehouse-1',
        binId: 'bin-1',
        productId: 'product-1',
        quantity: 4,
        reason: 'Re-slot top seller'
      });
    });

    fireEvent.change(screen.getByLabelText('Transfer product'), {
      target: { value: 'product-1' }
    });
    fireEvent.change(screen.getByLabelText('From bin'), {
      target: { value: 'bin-1' }
    });
    fireEvent.change(screen.getByLabelText('To bin'), {
      target: { value: 'bin-2' }
    });
    fireEvent.change(screen.getByLabelText('Transfer quantity'), {
      target: { value: '2' }
    });
    fireEvent.change(screen.getByPlaceholderText('Move closer to pick face'), {
      target: { value: 'Rebalance pick faces' }
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Transfer between bins' })
    );

    await waitFor(() => {
      expect(transferWmsBinStockRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        fromBinId: 'bin-1',
        toBinId: 'bin-2',
        quantity: 2,
        reason: 'Rebalance pick faces'
      });
    });
  });

  it('loads replenishment advice and runs a pick-ticket task flow', async () => {
    createWmsPickTicketRequest.mockResolvedValue({
      _id: 'ticket-1',
      ticketNumber: 'PT-001',
      status: 'CREATED',
      items: [{ product: 'product-1', requestedQuantity: 3 }],
      createdAt: '2026-03-21T07:30:00.000Z'
    });
    startWmsPickTicketRequest.mockResolvedValue({
      _id: 'ticket-1',
      ticketNumber: 'PT-001',
      status: 'PICKING',
      items: [{ product: 'product-1', requestedQuantity: 3 }],
      createdAt: '2026-03-21T07:30:00.000Z'
    });
    completeWmsPickTicketRequest.mockResolvedValue({
      _id: 'ticket-1',
      ticketNumber: 'PT-001',
      status: 'PACKED',
      items: [{ product: 'product-1', requestedQuantity: 3 }],
      createdAt: '2026-03-21T07:30:00.000Z'
    });

    await renderWithProviders(
      <Warehouses
        accessToken="token"
        userRole="manager"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Replenishment recommendations'
      })
    ).toBeInTheDocument();
    const replenishmentCard = screen
      .getByRole('heading', { name: 'Replenishment recommendations' })
      .closest('article');
    const replenishmentScope = within(replenishmentCard);

    expect(await replenishmentScope.findByText('A-01')).toBeInTheDocument();
    expect(getWmsReplenishmentRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      warehouseId: 'warehouse-1'
    });

    const pickTicketCard = screen
      .getByRole('heading', { name: 'Create pick ticket' })
      .closest('article');
    const pickTicketScope = within(pickTicketCard);

    fireEvent.change(pickTicketScope.getByLabelText('Pick product'), {
      target: { value: 'product-1' }
    });
    fireEvent.change(pickTicketScope.getByLabelText('Pick quantity'), {
      target: { value: '3' }
    });
    fireEvent.change(pickTicketScope.getByPlaceholderText('LOT-001'), {
      target: { value: 'LOT-77' }
    });
    fireEvent.click(
      pickTicketScope.getByRole('button', { name: 'Add pick line' })
    );

    expect(await screen.findByText('LOT-77')).toBeInTheDocument();

    fireEvent.change(
      pickTicketScope.getByPlaceholderText('Pack with fragile labels'),
      {
        target: { value: 'Pack by bay 2' }
      }
    );
    fireEvent.click(
      pickTicketScope.getByRole('button', { name: 'Create pick ticket' })
    );

    await waitFor(() => {
      expect(createWmsPickTicketRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        warehouseId: 'warehouse-1',
        items: [
          {
            productId: 'product-1',
            quantity: 3,
            lotNumber: 'LOT-77'
          }
        ],
        notes: 'Pack by bay 2'
      });
    });

    expect(await screen.findByText('PT-001')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    await waitFor(() => {
      expect(startWmsPickTicketRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        ticketId: 'ticket-1'
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Complete' }));

    await waitFor(() => {
      expect(completeWmsPickTicketRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        ticketId: 'ticket-1'
      });
    });

    expect(await screen.findByText('PACKED')).toBeInTheDocument();
  });

  it('prefills replenishment transfers and updates selected bin rules', async () => {
    transferWmsBinStockRequest.mockResolvedValue({
      _id: 'move-3'
    });
    updateWmsBinRulesRequest.mockResolvedValue({
      _id: 'bin-1',
      code: 'A-01',
      zone: 'Fast movers',
      maxCapacityUnits: 40,
      replenishmentMinUnits: 5,
      replenishmentTargetUnits: 12
    });

    await renderWithProviders(
      <Warehouses
        accessToken="token"
        userRole="manager"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    const replenishmentCard = (
      await screen.findByRole('heading', {
        name: 'Replenishment recommendations'
      })
    ).closest('article');
    const replenishmentScope = within(replenishmentCard);

    fireEvent.click(
      replenishmentScope.getByRole('button', { name: 'Prefill transfer' })
    );

    const binActionsCard = screen
      .getByRole('heading', { name: 'Bin stock actions' })
      .closest('article');
    const binActionsScope = within(binActionsCard);

    await waitFor(() => {
      expect(binActionsScope.getByLabelText('Transfer product')).toHaveValue(
        'product-1'
      );
      expect(binActionsScope.getByLabelText('From bin')).toHaveValue('bin-2');
      expect(binActionsScope.getByLabelText('To bin')).toHaveValue('bin-1');
      expect(binActionsScope.getByLabelText('Transfer quantity')).toHaveValue(
        4
      );
    });

    fireEvent.click(
      binActionsScope.getByRole('button', { name: 'Transfer between bins' })
    );

    await waitFor(() => {
      expect(transferWmsBinStockRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        warehouseId: 'warehouse-1',
        productId: 'product-1',
        fromBinId: 'bin-2',
        toBinId: 'bin-1',
        quantity: 4,
        reason: 'Replenish A-01'
      });
    });

    const rulesCard = screen
      .getByRole('heading', { name: 'Selected bin rules' })
      .closest('article');
    const rulesScope = within(rulesCard);

    fireEvent.change(rulesScope.getByLabelText('Selected bin max capacity'), {
      target: { value: '40' }
    });
    fireEvent.change(
      rulesScope.getByLabelText('Selected bin replenishment min'),
      {
        target: { value: '5' }
      }
    );
    fireEvent.change(
      rulesScope.getByLabelText('Selected bin replenishment target'),
      {
        target: { value: '12' }
      }
    );
    fireEvent.click(rulesScope.getByRole('button', { name: 'Save bin rules' }));

    await waitFor(() => {
      expect(updateWmsBinRulesRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        warehouseId: 'warehouse-1',
        binId: 'bin-1',
        maxCapacityUnits: 40,
        replenishmentMinUnits: 5,
        replenishmentTargetUnits: 12
      });
    });
  });

  it('loads warehouse movements and runs a scoped stocktake workflow', async () => {
    createInventoryStocktakeSessionRequest.mockResolvedValue({
      _id: 'stocktake-2',
      title: 'Cycle count - pick face',
      status: 'OPEN'
    });
    submitInventoryStocktakeCountsRequest.mockResolvedValue({
      _id: 'stocktake-1',
      status: 'IN_REVIEW'
    });
    approveInventoryStocktakeSessionRequest.mockResolvedValue({
      _id: 'stocktake-1',
      status: 'APPROVED'
    });

    await renderWithProviders(
      <Warehouses
        accessToken="token"
        userRole="manager"
        warehouseId="warehouse-1"
        activeWarehouseLabel="Main Warehouse"
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Warehouse movement ledger' })
    ).toBeInTheDocument();
    expect(getWmsMovementLedgerRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      warehouseId: 'warehouse-1',
      productId: null,
      type: null,
      limit: 20
    });
    expect(await screen.findByText('Shifted to reserve')).toBeInTheDocument();

    const stocktakeCard = screen
      .getByRole('heading', { name: 'Warehouse stocktakes' })
      .closest('article');
    const stocktakeScope = within(stocktakeCard);

    expect(
      await stocktakeScope.findByText('Morning cycle count')
    ).toBeInTheDocument();
    expect(getInventoryStocktakeSessionRequest).toHaveBeenCalledWith({
      accessToken: 'token',
      sessionId: 'stocktake-1'
    });

    fireEvent.change(stocktakeScope.getByLabelText('Counted WID-001'), {
      target: { value: '5' }
    });
    fireEvent.click(
      stocktakeScope.getByRole('button', { name: 'Submit counts' })
    );

    await waitFor(() => {
      expect(submitInventoryStocktakeCountsRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        sessionId: 'stocktake-1',
        counts: [
          {
            productId: 'product-1',
            countedQuantity: 5
          }
        ]
      });
    });

    fireEvent.click(
      stocktakeScope.getByRole('button', { name: 'Approve session' })
    );

    await waitFor(() => {
      expect(approveInventoryStocktakeSessionRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        sessionId: 'stocktake-1'
      });
    });

    fireEvent.change(
      stocktakeScope.getByPlaceholderText('Cycle count - fast movers'),
      {
        target: { value: 'Cycle count - pick face' }
      }
    );
    fireEvent.change(
      stocktakeScope.getByPlaceholderText('Run before afternoon dispatch'),
      {
        target: { value: 'Start before loading vans' }
      }
    );
    fireEvent.click(
      stocktakeScope.getByRole('button', { name: 'Create stocktake' })
    );

    await waitFor(() => {
      expect(createInventoryStocktakeSessionRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        warehouseId: 'warehouse-1',
        title: 'Cycle count - pick face',
        notes: 'Start before loading vans'
      });
    });

    expect(
      await stocktakeScope.findByText(
        'Stocktake session created for the selected warehouse.'
      )
    ).toBeInTheDocument();
  });
});
