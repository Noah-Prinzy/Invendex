import { fireEvent, screen, waitFor } from '@testing-library/react';
import Users from '../Users.js';
import { renderWithProviders } from '../../test/renderWithProviders.js';
import {
  createUserInviteRequest,
  getOnlineUsersRequest,
  getUserInvitesRequest,
  getUsersRequest,
  revokeUserInviteRequest,
  updateUserStatusRequest
} from '../../api/client.js';

jest.mock('../../api/client.js', () => ({
  createUserInviteRequest: jest.fn(),
  getOnlineUsersRequest: jest.fn(),
  getUserInvitesRequest: jest.fn(),
  getUsersRequest: jest.fn(),
  revokeUserInviteRequest: jest.fn(),
  updateUserStatusRequest: jest.fn()
}));

describe('Users page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('shows role restriction message for non-admin roles', () => {
    renderWithProviders(
      <Users accessToken="token" userRole="staff" currentUserId="u-1" />
    );
    expect(
      screen.getByText('Only owner/admin roles can manage users.')
    ).toBeInTheDocument();
  });

  it('loads users and toggles status', async () => {
    getUsersRequest.mockResolvedValueOnce([
      {
        _id: 'u-1',
        email: 'admin@example.com',
        role: 'admin',
        isActive: true,
        isVerified: true
      },
      {
        _id: 'u-2',
        email: 'staff@example.com',
        role: 'staff',
        isActive: true,
        isVerified: false
      }
    ]);
    getOnlineUsersRequest.mockResolvedValueOnce([
      {
        userId: 'u-1',
        email: 'admin@example.com',
        role: 'admin',
        sessions: 1,
        lastSeenAt: '2026-02-25T10:00:00.000Z'
      }
    ]);
    getUserInvitesRequest.mockResolvedValueOnce([
      {
        _id: 'inv-1',
        email: 'staff@example.com',
        status: 'ACTIVE',
        expiresAt: '2026-02-26T00:00:00.000Z'
      }
    ]);
    createUserInviteRequest.mockResolvedValue({
      _id: 'inv-2',
      email: 'new@example.com',
      status: 'ACTIVE',
      inviteCode: 'INV-ABC-DEF',
      expiresAt: '2026-02-27T00:00:00.000Z'
    });
    revokeUserInviteRequest.mockResolvedValue({
      _id: 'inv-1',
      email: 'staff@example.com',
      status: 'REVOKED',
      expiresAt: '2026-02-26T00:00:00.000Z'
    });

    updateUserStatusRequest.mockResolvedValueOnce({
      _id: 'u-2',
      email: 'staff@example.com',
      role: 'staff',
      isActive: false,
      isVerified: false
    });

    renderWithProviders(
      <Users accessToken="token" userRole="admin" currentUserId="u-1" />
    );

    const staffRows = await screen.findAllByText('staff@example.com');
    expect(staffRows.length).toBeGreaterThan(0);

    const deactivateButtons = screen.getAllByRole('button', {
      name: 'Deactivate'
    });
    fireEvent.click(deactivateButtons.find((button) => !button.disabled));

    await waitFor(() => {
      expect(updateUserStatusRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        userId: 'u-2',
        isActive: false
      });
      expect(
        screen.getAllByRole('button', { name: 'Activate' }).length
      ).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole('button', { name: 'Create invite' }));
    await waitFor(() => {
      expect(createUserInviteRequest).toHaveBeenCalled();
      expect(screen.getByText(/New invite code:/)).toBeInTheDocument();
    });

    const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
    fireEvent.click(revokeButtons[revokeButtons.length - 1]);
    await waitFor(() => {
      expect(revokeUserInviteRequest).toHaveBeenCalledWith({
        accessToken: 'token',
        inviteId: 'inv-1'
      });
      expect(screen.getByText('REVOKED')).toBeInTheDocument();
    });
  });
});
