import { fireEvent, screen, waitFor } from '@testing-library/react';
import Suppliers from '../suppliers/SuppliersPage.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  createSupplierRequest,
  deleteSupplierRequest,
  getSupplierRankingsRequest,
  getSuppliersRequest,
  updateSupplierRequest
} from '../../api/client.js';

vi.mock('../../api/client.js', () => ({
  createSupplierRequest: vi.fn(),
  deleteSupplierRequest: vi.fn(),
  getSuppliersRequest: vi.fn(),
  getSupplierRankingsRequest: vi.fn(),
  updateSupplierRequest: vi.fn()
}));

const seedSupplierQueries = () => {
  getSuppliersRequest.mockResolvedValue([
    {
      _id: 's1',
      name: 'Acme Supply',
      email: 'a@acme.com',
      phone: '111',
      isActive: true,
      notes: 'Fast turnaround'
    },
    {
      _id: 's2',
      name: 'Bravo Parts',
      email: 'b@bravo.com',
      phone: '222',
      isActive: false,
      notes: ''
    }
  ]);
  getSupplierRankingsRequest.mockResolvedValue([
    { supplierId: 's1', rank: 1, name: 'Acme Supply', finalScore: 91 }
  ]);
};

describe('Suppliers page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seedSupplierQueries();
  });

  it('shows permission gate for non-owner/admin users', async () => {
    await renderWithProviders(
      <Suppliers accessToken="token" userRole="manager" />
    );

    expect(screen.getByText('Owner or admin role needed')).toBeInTheDocument();
    expect(getSuppliersRequest).not.toHaveBeenCalled();
  });

  it('loads owner data and filters directory by search text', async () => {
    await renderWithProviders(
      <Suppliers accessToken="token" userRole="owner" />
    );

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

  it('creates, edits, and deletes suppliers from the directory', async () => {
    createSupplierRequest.mockResolvedValue({
      _id: 's3',
      name: 'Delta Goods'
    });
    updateSupplierRequest.mockResolvedValue({
      _id: 's1',
      name: 'Acme Updated'
    });
    deleteSupplierRequest.mockResolvedValue({});

    await renderWithProviders(
      <Suppliers accessToken="token" userRole="admin" />
    );

    expect(
      await screen.findByRole('heading', { name: 'Add supplier' })
    ).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Supplier name'), {
      target: { value: 'Delta Goods' }
    });
    fireEvent.change(screen.getByPlaceholderText('supplier@example.com'), {
      target: { value: 'delta@example.com' }
    });
    fireEvent.change(screen.getByPlaceholderText('+254...'), {
      target: { value: '333' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add supplier' }));

    await waitFor(() => {
      expect(createSupplierRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        name: 'Delta Goods',
        email: 'delta@example.com',
        phone: '333',
        notes: '',
        isActive: true
      });
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Edit' })[0]);

    expect(await screen.findByDisplayValue('Acme Supply')).toBeInTheDocument();
    fireEvent.change(screen.getByDisplayValue('Acme Supply'), {
      target: { value: 'Acme Updated' }
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save supplier' }));

    await waitFor(() => {
      expect(updateSupplierRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        supplierId: 's1',
        payload: expect.objectContaining({
          name: 'Acme Updated'
        })
      });
    });

    fireEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0]);

    await waitFor(() => {
      expect(deleteSupplierRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        supplierId: 's1'
      });
    });
  });
});
