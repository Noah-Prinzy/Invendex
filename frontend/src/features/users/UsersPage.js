import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserInviteRequest,
  getOnlineUsersRequest,
  getUserInvitesRequest,
  getUsersRequest,
  revokeUserInviteRequest,
  updateUserStatusRequest
} from '../../api/client.js';

const CAN_MANAGE_ROLES = new Set(['owner', 'admin']);
const USERS_QUERY_STALE_TIME_MS = 30 * 1000;

const normalizeUsersPayload = (payload) => ({
  users: Array.isArray(payload?.users) ? payload.users : [],
  onlineUsers: Array.isArray(payload?.onlineUsers) ? payload.onlineUsers : [],
  invites: Array.isArray(payload?.invites) ? payload.invites : []
});

const Users = ({ accessToken, userRole = null, currentUserId = null }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteHours, setInviteHours] = useState(72);
  const [latestInviteCode, setLatestInviteCode] = useState('');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingUserIds, setPendingUserIds] = useState(() => new Set());
  const [pendingInviteIds, setPendingInviteIds] = useState(() => new Set());

  const canManageUsers = CAN_MANAGE_ROLES.has(
    String(userRole || '').toLowerCase()
  );
  const queryClient = useQueryClient();
  const usersQueryKey = useMemo(
    () => [
      'users:management',
      String(accessToken || ''),
      String(canManageUsers)
    ],
    [accessToken, canManageUsers]
  );

  const usersQuery = useQuery({
    queryKey: usersQueryKey,
    enabled: Boolean(accessToken) && canManageUsers,
    staleTime: USERS_QUERY_STALE_TIME_MS,
    queryFn: async () => {
      const [usersData, onlineUsersData, invitesData] = await Promise.all([
        getUsersRequest(accessToken),
        getOnlineUsersRequest(accessToken),
        getUserInvitesRequest(accessToken)
      ]);

      return normalizeUsersPayload({
        users: usersData,
        onlineUsers: onlineUsersData,
        invites: invitesData
      });
    }
  });

  const usersPayload = useMemo(
    () => normalizeUsersPayload(usersQuery.data),
    [usersQuery.data]
  );

  const users = usersPayload.users;
  const onlineUsers = usersPayload.onlineUsers;
  const invites = usersPayload.invites;
  const queryErrorMessage = String(usersQuery.error?.message || '').trim();
  const displayError = String(error || queryErrorMessage || '').trim();
  const isLoading = usersQuery.isLoading || usersQuery.isFetching;

  const filteredUsers = useMemo(() => {
    if (statusFilter === 'active') {
      return users.filter((user) => user.isActive !== false);
    }
    if (statusFilter === 'inactive') {
      return users.filter((user) => user.isActive === false);
    }
    return users;
  }, [users, statusFilter]);

  const activeCount = useMemo(
    () => users.filter((user) => user.isActive !== false).length,
    [users]
  );

  const verifiedCount = useMemo(
    () => users.filter((user) => user.isVerified === true).length,
    [users]
  );

  const activeInviteCount = useMemo(
    () => invites.filter((invite) => invite.status === 'ACTIVE').length,
    [invites]
  );

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, isActive }) =>
      updateUserStatusRequest({
        accessToken,
        userId,
        isActive
      }),
    onMutate: async ({ userId, isActive }) => {
      const userIdKey = String(userId || '');
      setError('');
      setPendingUserIds((current) => new Set(current).add(userIdKey));

      await queryClient.cancelQueries({ queryKey: usersQueryKey });
      const previousData = queryClient.getQueryData(usersQueryKey);

      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          users: safeCurrent.users.map((user) =>
            String(user._id || '') === userIdKey ? { ...user, isActive } : user
          )
        };
      });

      return { previousData, userIdKey };
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          users: safeCurrent.users.map((user) =>
            String(user._id || '') === String(updatedUser?._id || '')
              ? { ...user, ...updatedUser }
              : user
          )
        };
      });
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(usersQueryKey, context.previousData);
      }
      setError(mutationError?.message || 'Failed to update user status');
    },
    onSettled: (_data, _error, _variables, context) => {
      setPendingUserIds((current) => {
        const next = new Set(current);
        next.delete(String(context?.userIdKey || ''));
        return next;
      });
    }
  });

  const createInviteMutation = useMutation({
    mutationFn: ({ email, expiresInHours }) =>
      createUserInviteRequest({
        accessToken,
        email,
        expiresInHours
      }),
    onMutate: async ({ email, expiresInHours }) => {
      const tempInviteId = `temp-${Date.now()}`;
      setError('');
      setLatestInviteCode('');

      await queryClient.cancelQueries({ queryKey: usersQueryKey });
      const previousData = queryClient.getQueryData(usersQueryKey);

      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        const optimisticInvite = {
          _id: tempInviteId,
          email: email || null,
          status: 'CREATING',
          expiresAt: new Date(
            Date.now() + Number(expiresInHours || 72) * 60 * 60 * 1000
          ).toISOString()
        };

        return {
          ...safeCurrent,
          invites: [optimisticInvite, ...safeCurrent.invites]
        };
      });

      return { previousData, tempInviteId };
    },
    onSuccess: (createdInvite, _variables, context) => {
      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          invites: safeCurrent.invites.map((invite) =>
            String(invite._id || '') === String(context?.tempInviteId || '')
              ? createdInvite
              : invite
          )
        };
      });

      setLatestInviteCode(String(createdInvite?.inviteCode || ''));
      setInviteEmail('');
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(usersQueryKey, context.previousData);
      }
      setError(mutationError?.message || 'Failed to create invite');
    }
  });

  const revokeInviteMutation = useMutation({
    mutationFn: (inviteId) =>
      revokeUserInviteRequest({
        accessToken,
        inviteId
      }),
    onMutate: async (inviteId) => {
      const inviteIdKey = String(inviteId || '');
      setError('');
      setPendingInviteIds((current) => new Set(current).add(inviteIdKey));

      await queryClient.cancelQueries({ queryKey: usersQueryKey });
      const previousData = queryClient.getQueryData(usersQueryKey);

      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          invites: safeCurrent.invites.map((invite) =>
            String(invite._id || '') === inviteIdKey
              ? { ...invite, status: 'REVOKED' }
              : invite
          )
        };
      });

      return { previousData, inviteIdKey };
    },
    onSuccess: (revokedInvite) => {
      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          invites: safeCurrent.invites.map((invite) =>
            String(invite._id || '') === String(revokedInvite?._id || '')
              ? { ...invite, ...revokedInvite }
              : invite
          )
        };
      });
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(usersQueryKey, context.previousData);
      }
      setError(mutationError?.message || 'Failed to revoke invite');
    },
    onSettled: (_data, _error, _variables, context) => {
      setPendingInviteIds((current) => {
        const next = new Set(current);
        next.delete(String(context?.inviteIdKey || ''));
        return next;
      });
    }
  });

  const updateUserStatus = async (userId, isActive) => {
    if (!accessToken) return;
    updateUserStatusMutation.mutate({ userId, isActive });
  };

  const createInvite = async () => {
    if (!accessToken) return;

    const normalizedEmail = String(inviteEmail || '').trim();
    const parsedHours = Number(inviteHours || 72);
    const expiresInHours = Number.isFinite(parsedHours)
      ? Math.min(720, Math.max(1, parsedHours))
      : 72;

    createInviteMutation.mutate({
      email: normalizedEmail,
      expiresInHours
    });
  };

  const revokeInvite = async (inviteId) => {
    if (!accessToken) return;
    revokeInviteMutation.mutate(inviteId);
  };

  if (!canManageUsers) {
    return (
      <section className="panel">
        <header className="panel-head">
          <div>
            <h2>User Management</h2>
            <p>Only owner/admin roles can manage users.</p>
          </div>
        </header>
      </section>
    );
  }

  return (
    <section className="panel">
      <header className="panel-head panel-head-row">
        <div>
          <h2>User Management</h2>
          <p>Manage organization members and account status.</p>
        </div>
        <button
          type="button"
          className="btn-ghost"
          onClick={() => usersQuery.refetch()}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Refresh'}
        </button>
      </header>

      <div className="metric-grid">
        <article className="metric-card metric-card-users-total">
          <p className="metric-label">Total users</p>
          <p className="metric-value">{users.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Active users</p>
          <p className="metric-value">{activeCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Verified users</p>
          <p className="metric-value">{verifiedCount}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Online users</p>
          <p className="metric-value">{onlineUsers.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Active invites</p>
          <p className="metric-value">{activeInviteCount}</p>
        </article>
      </div>

      {displayError ? <p className="form-error">{displayError}</p> : null}

      <article className="data-card">
        <h3>Organization users</h3>

        <div className="control-row">
          <label className="control-field">
            <span>Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
        </div>

        {filteredUsers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isCurrentUser =
                    String(currentUserId || '') === String(user._id || '');
                  const isActive = user.isActive !== false;
                  return (
                    <tr key={user._id}>
                      <td>{user.email}</td>
                      <td>{user.role}</td>
                      <td>{user.isVerified ? 'Yes' : 'No'}</td>
                      <td>{isActive ? 'Active' : 'Inactive'}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-ghost"
                          disabled={
                            isCurrentUser ||
                            pendingUserIds.has(String(user._id || ''))
                          }
                          onClick={() => updateUserStatus(user._id, !isActive)}
                        >
                          {isActive ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No users found for this filter.</p>
        )}
      </article>

      <article className="data-card">
        <h3>Online users</h3>
        {onlineUsers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Sessions</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {onlineUsers.map((user) => (
                  <tr key={user.userId}>
                    <td>{user.email || '-'}</td>
                    <td>{user.role || '-'}</td>
                    <td>{Number(user.sessions || 0)}</td>
                    <td>
                      {user.lastSeenAt
                        ? new Date(user.lastSeenAt).toLocaleTimeString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No online users right now.</p>
        )}
      </article>

      <article className="data-card">
        <h3>Employee invites</h3>
        <div className="control-row">
          <label className="control-field">
            <span>Invite email (optional)</span>
            <input
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
              placeholder="employee@company.com"
            />
          </label>
          <label className="control-field">
            <span>Expires in hours</span>
            <input
              type="number"
              min="1"
              max="720"
              value={inviteHours}
              onChange={(event) =>
                setInviteHours(Number(event.target.value || 72))
              }
            />
          </label>
          <button
            type="button"
            className="btn-ghost"
            onClick={createInvite}
            disabled={createInviteMutation.isPending}
          >
            {createInviteMutation.isPending ? 'Creating...' : 'Create invite'}
          </button>
        </div>

        {latestInviteCode ? (
          <p className="form-copy">
            New invite code: <strong>{latestInviteCode}</strong>
          </p>
        ) : null}

        {invites.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => (
                  <tr key={invite._id}>
                    <td>{invite.email || 'Any email'}</td>
                    <td>{invite.status}</td>
                    <td>
                      {invite.expiresAt
                        ? new Date(invite.expiresAt).toLocaleString()
                        : '-'}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost"
                        disabled={
                          invite.status !== 'ACTIVE' ||
                          pendingInviteIds.has(String(invite._id || ''))
                        }
                        onClick={() => revokeInvite(invite._id)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">No invites yet.</p>
        )}
      </article>
    </section>
  );
};

export default Users;
