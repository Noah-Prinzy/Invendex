import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Reports from '../Reports.js';
import {
  getReportPurchaseOrderStatusSummaryRequest,
  getReportSpendBySupplierRequest,
  getReportSpendSummaryRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  getReportPurchaseOrderStatusSummaryRequest: jest.fn(),
  getReportSpendSummaryRequest: jest.fn(),
  getReportSpendBySupplierRequest: jest.fn()
}));

describe('Reports page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows permission gate for non-admin users', () => {
    render(<Reports accessToken="token" userRole="staff" />);

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

    render(<Reports accessToken="token" userRole="admin" />);

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
