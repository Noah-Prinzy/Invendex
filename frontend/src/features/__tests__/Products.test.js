import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import Products from '../products/ProductsPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  adjustProductStockRequest,
  createProductRequest,
  getDeletedProductsRequest,
  getProductsLowStockSummaryRequest,
  getProductsRequest,
  permanentlyDeleteProductRequest,
  restoreDeletedProductRequest,
  softDeleteProductRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  adjustProductStockRequest: jest.fn(),
  createProductRequest: jest.fn(),
  getDeletedProductsRequest: jest.fn(),
  getProductsRequest: jest.fn(),
  getProductsLowStockSummaryRequest: jest.fn(),
  permanentlyDeleteProductRequest: jest.fn(),
  restoreDeletedProductRequest: jest.fn(),
  softDeleteProductRequest: jest.fn()
}));

const buildProducts = (count) =>
  Array.from({ length: count }).map((_, index) => ({
    _id: `p-${index + 1}`,
    name: `Product ${index + 1}`,
    sku: `SKU-${index + 1}`,
    category: index % 2 === 0 ? 'A' : 'B',
    stock: index + 1,
    lowStockThreshold: 2,
    price: index + 10
  }));

describe('Products page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adjustProductStockRequest.mockResolvedValue({
      id: 'noop',
      stock: 1
    });
    createProductRequest.mockResolvedValue({});
    softDeleteProductRequest.mockResolvedValue({});
    restoreDeletedProductRequest.mockResolvedValue({});
    permanentlyDeleteProductRequest.mockResolvedValue({});
    getDeletedProductsRequest.mockResolvedValue([]);
  });

  it('shows loading and renders error state on failed fetch', async () => {
    getProductsRequest.mockRejectedValueOnce(new Error('Products failed'));

    renderWithProviders(<Products accessToken="test-token" userRole="admin" />);

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    expect(await screen.findByText('Products failed')).toBeInTheDocument();
  });

  it('supports filtering and pagination after data load', async () => {
    getProductsRequest.mockImplementation((_token, filters = {}) => {
      const normalizedSearch = String(filters?.q || '').toLowerCase();
      if (normalizedSearch.includes('product 10')) {
        return Promise.resolve([
          {
            _id: 'p-10',
            name: 'Product 10',
            sku: 'SKU-10',
            category: 'B',
            stock: 10,
            lowStockThreshold: 2,
            price: 20
          }
        ]);
      }
      return Promise.resolve(buildProducts(10));
    });
    getProductsLowStockSummaryRequest.mockResolvedValueOnce([
      { sku: 'SKU-1' },
      { sku: 'SKU-2' }
    ]);

    renderWithProviders(<Products accessToken="test-token" userRole="admin" />);

    const table = await screen.findByRole('table');
    expect(within(table).getByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();

    fireEvent.change(
      screen.getByPlaceholderText('Name, SKU, category, barcode'),
      {
        target: { value: 'Product 10' }
      }
    );
    fireEvent.change(screen.getByLabelText('Stock'), {
      target: { value: 'all' }
    });

    await waitFor(() => {
      expect(
        screen.getByText('Showing 1 of 1 filtered products (1 total)')
      ).toBeInTheDocument();
      expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
      expect(
        screen.queryByText('No products match your filter.')
      ).not.toBeInTheDocument();
    });
  });
});
