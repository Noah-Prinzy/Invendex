import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import Products from '../Products.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  getProductsLowStockSummaryRequest,
  getProductsRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  getProductsRequest: jest.fn(),
  getProductsLowStockSummaryRequest: jest.fn()
}));

const buildProducts = count =>
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
  });

  it('shows loading and renders error state on failed fetch', async () => {
    getProductsRequest.mockRejectedValueOnce(new Error('Products failed'));

    renderWithProviders(<Products accessToken="test-token" userRole="admin" />);

    expect(screen.getByRole('button', { name: /loading/i })).toBeDisabled();
    expect(await screen.findByText('Products failed')).toBeInTheDocument();
  });

  it('supports filtering and pagination after data load', async () => {
    getProductsRequest.mockResolvedValueOnce(buildProducts(10));
    getProductsLowStockSummaryRequest.mockResolvedValueOnce([
      { sku: 'SKU-1' },
      { sku: 'SKU-2' }
    ]);

    renderWithProviders(<Products accessToken="test-token" userRole="admin" />);

    expect(await screen.findByText('Product 1')).toBeInTheDocument();
    expect(screen.getByText('Page 1 / 2')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Name, SKU, category'), {
      target: { value: 'Product 10' }
    });

    await waitFor(() => {
      expect(screen.getByText('Product 10')).toBeInTheDocument();
      expect(screen.queryByText('Product 1')).not.toBeInTheDocument();
      expect(screen.getByText('Page 1 / 1')).toBeInTheDocument();
    });
  });
});
