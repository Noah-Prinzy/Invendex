import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  createUserInviteRequest,
  getOnlineUsersRequest,
  getUserProductivityRequest,
  getUserRolePermissionsMatrixRequest,
  getUserInvitesRequest,
  getUsersRequest,
  revokeUserInviteRequest,
  updateUserRolePermissionsMatrixRequest,
  updateUserRoleRequest,
  updateUserStatusRequest
} from '../../api/client.js';
import { SectionHint } from '../../components/PageGuide.js';

const CAN_MANAGE_ROLES = new Set(['owner', 'admin']);
const MUTABLE_ROLES = ['staff', 'manager', 'admin'];
const MATRIX_EDITABLE_ROLES = ['staff', 'manager', 'admin'];
const USERS_QUERY_STALE_TIME_MS = 30 * 1000;

const normalizeUsersPayload = (payload) => ({
  users: Array.isArray(payload?.users) ? payload.users : [],
  onlineUsers: Array.isArray(payload?.onlineUsers) ? payload.onlineUsers : [],
  invites: Array.isArray(payload?.invites) ? payload.invites : [],
  productivity:
    payload?.productivity && typeof payload.productivity === 'object'
      ? payload.productivity
      : { days: 7, summary: {}, rows: [] },
  rolePermissions:
    payload?.rolePermissions && typeof payload.rolePermissions === 'object'
      ? payload.rolePermissions
      : {
          catalog: [],
          matrix: {
            staff: [],
            manager: [],
            admin: [],
            owner: []
          }
          }
});

const emailToUsernameFallback = (value) => {
  const normalized = String(value || '').trim();
  if (!normalized) return '';
  return normalized.includes('@') ? normalized.split('@')[0] : normalized;
};

const resolveUserDisplayName = (user, fallback = 'User') =>
  String(user?.username || '').trim() ||
  String(user?.name || '').trim() ||
  emailToUsernameFallback(user?.email) ||
  fallback;

const Users = ({ accessToken, userRole = null, currentUserId = null }) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [latestInviteCode, setLatestInviteCode] = useState('');
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pendingUserIds, setPendingUserIds] = useState(() => new Set());
  const [pendingRoleUserIds, setPendingRoleUserIds] = useState(() => new Set());
  const [pendingInviteIds, setPendingInviteIds] = useState(() => new Set());
  const [pendingMatrixRoles, setPendingMatrixRoles] = useState(() => new Set());

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
      const [
        usersData,
        onlineUsersData,
        invitesData,
        productivityData,
        rolePermissionsData
      ] = await Promise.all([
        getUsersRequest(accessToken),
        getOnlineUsersRequest(accessToken),
        getUserInvitesRequest(accessToken),
        getUserProductivityRequest({
          accessToken,
          days: 14,
          limit: 20
        }),
        getUserRolePermissionsMatrixRequest(accessToken)
      ]);

      return normalizeUsersPayload({
        users: usersData,
        onlineUsers: onlineUsersData,
        invites: invitesData,
        productivity: productivityData,
        rolePermissions: rolePermissionsData
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
  const productivity = usersPayload.productivity || {
    days: 7,
    summary: {},
    rows: []
  };
  const productivityRows = Array.isArray(productivity?.rows)
    ? productivity.rows
    : [];
  const rolePermissions = usersPayload.rolePermissions;
  const permissionCatalog = Array.isArray(rolePermissions?.catalog)
    ? rolePermissions.catalog
    : [];
  const permissionMatrix =
    rolePermissions?.matrix && typeof rolePermissions.matrix === 'object'
      ? rolePermissions.matrix
      : { staff: [], manager: [], admin: [], owner: [] };
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

  const averageAccuracyPct = useMemo(() => {
    if (!productivityRows.length) return 0;
    const total = productivityRows.reduce(
      (sum, row) => sum + Number(row.stocktakeAccuracyRatePct || 0),
      0
    );
    return Number((total / productivityRows.length).toFixed(2));
  }, [productivityRows]);

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

  const updateUserRoleMutation = useMutation({
    mutationFn: ({ userId, role }) =>
      updateUserRoleRequest({
        accessToken,
        userId,
        role
      }),
    onMutate: async ({ userId, role }) => {
      const userIdKey = String(userId || '');
      const nextRole = String(role || '').toLowerCase();
      setError('');
      setPendingRoleUserIds((current) => new Set(current).add(userIdKey));

      await queryClient.cancelQueries({ queryKey: usersQueryKey });
      const previousData = queryClient.getQueryData(usersQueryKey);

      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          users: safeCurrent.users.map((user) =>
            String(user._id || '') === userIdKey
              ? { ...user, role: nextRole }
              : user
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
      setError(mutationError?.message || 'Failed to update user role');
    },
    onSettled: (_data, _error, _variables, context) => {
      setPendingRoleUserIds((current) => {
        const next = new Set(current);
        next.delete(String(context?.userIdKey || ''));
        return next;
      });
    }
  });

  const updateRolePermissionMatrixMutation = useMutation({
    mutationFn: ({ role, permissions }) =>
      updateUserRolePermissionsMatrixRequest({
        accessToken,
        role,
        permissions
      }),
    onMutate: async ({ role, permissions }) => {
      const roleKey = String(role || '').toLowerCase();
      const nextPermissions = Array.isArray(permissions) ? permissions : [];
      setError('');
      setPendingMatrixRoles((current) => new Set(current).add(roleKey));

      await queryClient.cancelQueries({ queryKey: usersQueryKey });
      const previousData = queryClient.getQueryData(usersQueryKey);

      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          rolePermissions: {
            ...safeCurrent.rolePermissions,
            matrix: {
              ...(safeCurrent?.rolePermissions?.matrix || {}),
              [roleKey]: nextPermissions
            }
          }
        };
      });

      return { previousData, roleKey };
    },
    onSuccess: (payload) => {
      queryClient.setQueryData(usersQueryKey, (current) => {
        const safeCurrent = normalizeUsersPayload(current);
        return {
          ...safeCurrent,
          rolePermissions: payload || safeCurrent.rolePermissions
        };
      });
    },
    onError: (mutationError, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(usersQueryKey, context.previousData);
      }
      setError(
        mutationError?.message || 'Failed to update role permission matrix'
      );
    },
    onSettled: (_data, _error, _variables, context) => {
      setPendingMatrixRoles((current) => {
        const next = new Set(current);
        next.delete(String(context?.roleKey || ''));
        return next;
      });
    }
  });

  const createInviteMutation = useMutation({
    mutationFn: ({ email }) =>
      createUserInviteRequest({
        accessToken,
        email
      }),
    onMutate: async ({ email }) => {
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
          expiresAt: null
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

  const updateUserRole = async (userId, role) => {
    if (!accessToken) return;
    updateUserRoleMutation.mutate({ userId, role });
  };

  const toggleRolePermission = async (role, permission) => {
    if (!accessToken) return;

    const roleKey = String(role || '').toLowerCase();
    const permissionKey = String(permission || '').toLowerCase();
    const currentPermissions = Array.isArray(permissionMatrix?.[roleKey])
      ? permissionMatrix[roleKey]
      : [];

    const nextPermissions = currentPermissions.includes(permissionKey)
      ? currentPermissions.filter((entry) => entry !== permissionKey)
      : [...currentPermissions, permissionKey];

    updateRolePermissionMatrixMutation.mutate({
      role: roleKey,
      permissions: nextPermissions
    });
  };

  const createInvite = async () => {
    if (!accessToken) return;

    const normalizedEmail = String(inviteEmail || '').trim();

    createInviteMutation.mutate({
      email: normalizedEmail
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
          className="btn-ghost aligned-action-btn"
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
        <article className="metric-card">
          <p className="metric-label">Productivity rows</p>
          <p className="metric-value">{productivityRows.length}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Avg count accuracy</p>
          <p className="metric-value">{averageAccuracyPct}%</p>
        </article>
      </div>

      {displayError ? <p className="form-error">{displayError}</p> : null}

      <article className="data-card">
        <h3>
          Employee productivity ({Number(productivity?.days || 14)} day window)
        </h3>
        <SectionHint>
          This section helps you see contribution and accuracy trends across the
          team before changing roles or access.
        </SectionHint>
        {productivityRows.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Activity score</th>
                  <th>Movements</th>
                  <th>Stocktake lines</th>
                  <th>Approved sessions</th>
                  <th>PO received</th>
                  <th>Accuracy %</th>
                  <th>Errors</th>
                </tr>
              </thead>
              <tbody>
                {productivityRows.map((row) => (
                  <tr key={String(row.userId || row.username || row.email)}>
                    <td>{resolveUserDisplayName(row, '-')}</td>
                    <td>{row.role || '-'}</td>
                    <td>{Number(row.activityScore || 0).toFixed(2)}</td>
                    <td>{Number(row.movementCount || 0)}</td>
                    <td>{Number(row.stocktakeLinesCounted || 0)}</td>
                    <td>{Number(row.stocktakeSessionsApproved || 0)}</td>
                    <td>{Number(row.purchaseOrdersReceived || 0)}</td>
                    <td>
                      {Number(row.stocktakeAccuracyRatePct || 0).toFixed(2)}%
                    </td>
                    <td>{Number(row.errorCount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">
            No employee productivity activity in this period.
          </p>
        )}
      </article>

      <article className="data-card" data-tutorial-id="users-manage">
        <h3>Organization users</h3>
        <SectionHint>
          Use this table to manage who can enter the workspace and what role each
          person should have.
        </SectionHint>

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
                  <th>Username</th>
                  <th>Role</th>
                  <th>Verified</th>
                  <th>Status</th>
                  <th>Status action</th>
                  <th>Role action</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isCurrentUser =
                    String(currentUserId || '') === String(user._id || '');
                  const isActive = user.isActive !== false;
                  const userRoleValue = String(
                    user.role || 'staff'
                  ).toLowerCase();
                  const canModifyOwner =
                    String(userRole || '').toLowerCase() === 'owner';
                  const roleOptions =
                    userRoleValue === 'owner'
                      ? ['owner', ...MUTABLE_ROLES]
                      : MUTABLE_ROLES;
                  const roleChangeDisabled =
                    isCurrentUser ||
                    (userRoleValue === 'owner' && !canModifyOwner) ||
                    pendingRoleUserIds.has(String(user._id || ''));
                  return (
                    <tr key={user._id}>
                      <td>{resolveUserDisplayName(user)}</td>
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
                      <td>
                        <select
                          value={userRoleValue}
                          disabled={roleChangeDisabled}
                          onChange={(event) =>
                            updateUserRole(user._id, event.target.value)
                          }
                        >
                          {roleOptions.map((role) => (
                            <option key={`${user._id}-${role}`} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
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

      <article className="data-card" data-tutorial-id="users-permissions">
        <h3>Role permission matrix</h3>
        <p className="event-sub">
          Configure organization-wide permissions for staff, manager, and admin.
          Owner always retains full permissions.
        </p>
        <SectionHint>
          Change role permissions only when you want the same rule to apply to
          every user in that role.
        </SectionHint>

        {permissionCatalog.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Permission</th>
                  <th>Staff</th>
                  <th>Manager</th>
                  <th>Admin</th>
                </tr>
              </thead>
              <tbody>
                {permissionCatalog.map((permission) => (
                  <tr key={permission}>
                    <td>{permission}</td>
                    {MATRIX_EDITABLE_ROLES.map((role) => {
                      const rolePermissions = Array.isArray(
                        permissionMatrix?.[role]
                      )
                        ? permissionMatrix[role]
                        : [];
                      const enabled = rolePermissions.includes(permission);
                      return (
                        <td key={`${permission}-${role}`}>
                          <input
                            type="checkbox"
                            checked={enabled}
                            disabled={pendingMatrixRoles.has(role)}
                            onChange={() =>
                              toggleRolePermission(role, permission)
                            }
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="muted">Permission catalog unavailable right now.</p>
        )}
      </article>

      <article className="data-card">
        <h3>Online users</h3>
        {onlineUsers.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Sessions</th>
                  <th>Last seen</th>
                </tr>
              </thead>
              <tbody>
                {onlineUsers.map((user) => (
                  <tr key={user.userId}>
                    <td>{resolveUserDisplayName(user, '-')}</td>
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
          <button
            type="button"
            className="btn-ghost"
            onClick={createInvite}
            disabled={createInviteMutation.isPending}
          >
            {createInviteMutation.isPending ? 'Creating...' : 'Create invite'}
          </button>
        </div>

        <p className="event-sub">
          Invite expiry uses your organization default from Settings.
        </p>

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
