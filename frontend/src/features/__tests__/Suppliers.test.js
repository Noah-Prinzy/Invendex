import { fireEvent, screen, waitFor } from '@testing-library/react';
import Suppliers from '../suppliers/SuppliersPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  getSupplierRankingsRequest,
  getSuppliersRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  getSuppliersRequest: jest.fn(),
  getSupplierRankingsRequest: jest.fn()
}));

describe('Suppliers page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows permission gate for non-admin users', () => {
    renderWithProviders(<Suppliers accessToken="token" userRole="manager" />);

    expect(screen.getByText('Admin role needed')).toBeInTheDocument();
    expect(getSuppliersRequest).not.toHaveBeenCalled();
  });

  it('loads admin data and filters directory by search text', async () => {
    getSuppliersRequest.mockResolvedValueOnce([
      {
        _id: 's1',
        name: 'Acme Supply',
        email: 'a@acme.com',
        phone: '111',
        isActive: true
      },
      {
        _id: 's2',
        name: 'Bravo Parts',
        email: 'b@bravo.com',
        phone: '222',
        isActive: true
      }
    ]);
    getSupplierRankingsRequest.mockResolvedValueOnce([
      { supplierId: 's1', rank: 1, name: 'Acme Supply', finalScore: 91 }
    ]);

    renderWithProviders(<Suppliers accessToken="token" userRole="admin" />);

    expect(await screen.findAllByText('Acme Supply')).toHaveLength(2);
    expect(screen.getByText('Bravo Parts')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Name, email, phone'), {
      target: { value: 'Acme' }
    });

    await waitFor(() => {
      expect(screen.getAllByText('Acme Supply').length).toBeGreaterThanOrEqual(
        2
      );
      expect(screen.queryByText('Bravo Parts')).not.toBeInTheDocument();
    });
  });
});
