import { useCallback, useEffect, useState } from 'react';

const valueOrDash = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '-';
};

const formatRole = (role) => {
  const normalized = String(role || '').trim();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const formatDateTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '-';
  return date.toLocaleString();
};

const downloadJsonFile = ({ filename, data }) => {
  if (typeof window === 'undefined') return;
  const content = JSON.stringify(data, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const Account = ({
  user,
  onLoadSessions = async () => ({ success: true, sessions: [] }),
  onRevokeSession = async () => ({ success: false }),
  onLogoutOtherSessions = async () => ({ success: false }),
  onGetTwoFactorStatus = async () => ({ success: false }),
  onSetupTwoFactor = async () => ({ success: false }),
  onEnableTwoFactor = async () => ({ success: false }),
  onDisableTwoFactor = async () => ({ success: false }),
  onRegenerateTwoFactorRecoveryCodes = async () => ({ success: false }),
  onExportComplianceData = async () => ({ success: false }),
  onDeleteMyAccount = async () => ({ success: false }),
  onDeleteOrganization = async () => ({ success: false })
}) => {
  const organizationName = valueOrDash(
    user?.organizationName || user?.organization?.name
  );
  const organizationId = valueOrDash(
    typeof user?.organization === 'object'
      ? user?.organization?._id
      : user?.organization
  );
  const userId = valueOrDash(user?._id);
  const email = valueOrDash(user?.email);
  const role = formatRole(user?.role);
  const normalizedRole = String(user?.role || '')
    .trim()
    .toLowerCase();
  const canDeleteOrganization = normalizedRole === 'owner';

  const [sessions, setSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [sessionsError, setSessionsError] = useState('');
  const [sessionsNotice, setSessionsNotice] = useState('');
  const [twoFactorStatus, setTwoFactorStatus] = useState({
    enabled: false,
    pendingSetup: false,
    remainingRecoveryCodes: 0,
    enabledAt: null,
    lastVerifiedAt: null
  });
  const [twoFactorError, setTwoFactorError] = useState('');
  const [twoFactorNotice, setTwoFactorNotice] = useState('');
  const [twoFactorLoading, setTwoFactorLoading] = useState(false);
  const [twoFactorPassword, setTwoFactorPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorRecoveryCode, setTwoFactorRecoveryCode] = useState('');
  const [twoFactorSetupData, setTwoFactorSetupData] = useState(null);
  const [complianceError, setComplianceError] = useState('');
  const [complianceNotice, setComplianceNotice] = useState('');
  const [complianceLoading, setComplianceLoading] = useState(false);
  const [deleteAccountPassword, setDeleteAccountPassword] = useState('');
  const [deleteOrgPassword, setDeleteOrgPassword] = useState('');
  const [deleteOrgConfirmation, setDeleteOrgConfirmation] = useState('');

  const loadSessions = useCallback(async () => {
    setSessionsLoading(true);
    setSessionsError('');

    const response = await onLoadSessions();
    if (!response?.success) {
      setSessionsError(String(response?.message || 'Failed to load sessions'));
      setSessionsLoading(false);
      return;
    }

    setSessions(Array.isArray(response.sessions) ? response.sessions : []);
    setSessionsLoading(false);
  }, [onLoadSessions]);

  const loadTwoFactorStatus = useCallback(async () => {
    const response = await onGetTwoFactorStatus();
    if (!response?.success) {
      setTwoFactorError(
        String(response?.message || 'Failed to load two-factor status')
      );
      return;
    }

    setTwoFactorStatus({
      enabled: Boolean(response?.data?.enabled),
      pendingSetup: Boolean(response?.data?.pendingSetup),
      remainingRecoveryCodes: Number(
        response?.data?.remainingRecoveryCodes || 0
      ),
      enabledAt: response?.data?.enabledAt || null,
      lastVerifiedAt: response?.data?.lastVerifiedAt || null
    });
  }, [onGetTwoFactorStatus]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions, user?._id]);

  useEffect(() => {
    loadTwoFactorStatus();
  }, [loadTwoFactorStatus, user?._id]);

  const handleLogoutOthers = async () => {
    setSessionsNotice('');
    setSessionsError('');

    const response = await onLogoutOtherSessions();
    if (!response?.success) {
      setSessionsError(
        String(response?.message || 'Failed to log out sessions')
      );
      return;
    }

    setSessionsNotice(
      `Logged out ${Number(response.removedCount || 0)} other session(s).`
    );
    await loadSessions();
  };

  const handleRevoke = async (sessionId) => {
    setSessionsNotice('');
    setSessionsError('');

    const response = await onRevokeSession(sessionId);
    if (!response?.success) {
      setSessionsError(String(response?.message || 'Failed to revoke session'));
      return;
    }

    setSessionsNotice(String(response?.message || 'Session revoked'));
    if (!response?.currentSessionTerminated) {
      await loadSessions();
    }
  };

  const handleSetupTwoFactor = async () => {
    setTwoFactorError('');
    setTwoFactorNotice('');
    setTwoFactorLoading(true);

    const response = await onSetupTwoFactor({
      currentPassword: twoFactorPassword
    });
    setTwoFactorLoading(false);

    if (!response?.success) {
      setTwoFactorError(
        String(response?.message || 'Failed to initialize two-factor setup')
      );
      return;
    }

    setTwoFactorSetupData(response?.data || null);
    setTwoFactorNotice('Two-factor setup initialized. Verify code to enable.');
    await loadTwoFactorStatus();
  };

  const handleEnableTwoFactor = async () => {
    setTwoFactorError('');
    setTwoFactorNotice('');
    setTwoFactorLoading(true);

    const response = await onEnableTwoFactor({
      currentPassword: twoFactorPassword,
      code: twoFactorCode
    });
    setTwoFactorLoading(false);

    if (!response?.success) {
      setTwoFactorError(
        String(response?.message || 'Failed to enable two-factor')
      );
      return;
    }

    setTwoFactorSetupData(null);
    setTwoFactorCode('');
    setTwoFactorRecoveryCode('');
    setTwoFactorNotice('Two-factor authentication enabled.');
    await loadTwoFactorStatus();
  };

  const handleDisableTwoFactor = async () => {
    setTwoFactorError('');
    setTwoFactorNotice('');
    setTwoFactorLoading(true);

    const response = await onDisableTwoFactor({
      currentPassword: twoFactorPassword,
      code: twoFactorCode,
      recoveryCode: twoFactorRecoveryCode
    });
    setTwoFactorLoading(false);

    if (!response?.success) {
      setTwoFactorError(
        String(response?.message || 'Failed to disable two-factor')
      );
      return;
    }

    setTwoFactorSetupData(null);
    setTwoFactorCode('');
    setTwoFactorRecoveryCode('');
    setTwoFactorNotice('Two-factor authentication disabled.');
    await loadTwoFactorStatus();
  };

  const handleRegenerateRecoveryCodes = async () => {
    setTwoFactorError('');
    setTwoFactorNotice('');
    setTwoFactorLoading(true);

    const response = await onRegenerateTwoFactorRecoveryCodes({
      currentPassword: twoFactorPassword,
      code: twoFactorCode,
      recoveryCode: twoFactorRecoveryCode
    });
    setTwoFactorLoading(false);

    if (!response?.success) {
      setTwoFactorError(
        String(response?.message || 'Failed to regenerate recovery codes')
      );
      return;
    }

    setTwoFactorSetupData({
      recoveryCodes: Array.isArray(response?.data?.recoveryCodes)
        ? response.data.recoveryCodes
        : []
    });
    setTwoFactorNotice('Recovery codes regenerated.');
    await loadTwoFactorStatus();
  };

  const handleExportCompliance = async () => {
    setComplianceError('');
    setComplianceNotice('');
    setComplianceLoading(true);

    const response = await onExportComplianceData({
      includeAudit: false,
      limit: 2000
    });
    setComplianceLoading(false);

    if (!response?.success) {
      setComplianceError(
        String(response?.message || 'Failed to export organization data')
      );
      return;
    }

    downloadJsonFile({
      filename: `ledgerly-org-export-${Date.now()}.json`,
      data: response?.data || {}
    });
    setComplianceNotice('Organization export downloaded.');
  };

  const handleDeleteMyAccount = async () => {
    setComplianceError('');
    setComplianceNotice('');
    setComplianceLoading(true);

    const response = await onDeleteMyAccount({
      currentPassword: deleteAccountPassword,
      confirmationText: 'DELETE MY ACCOUNT'
    });
    setComplianceLoading(false);

    if (!response?.success) {
      setComplianceError(
        String(response?.message || 'Failed to deactivate account')
      );
      return;
    }

    setComplianceNotice('Account deactivated. You have been signed out.');
  };

  const handleDeleteOrganization = async () => {
    setComplianceError('');
    setComplianceNotice('');
    setComplianceLoading(true);

    const response = await onDeleteOrganization({
      currentPassword: deleteOrgPassword,
      confirmationText: deleteOrgConfirmation
    });
    setComplianceLoading(false);

    if (!response?.success) {
      setComplianceError(
        String(response?.message || 'Failed to deactivate organization')
      );
      return;
    }

    setComplianceNotice('Organization deactivated. You have been signed out.');
  };

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Account</h2>
          <p>
            User identity, organization profile context, and active sessions.
          </p>
        </div>
      </header>

      <div className="metric-grid">
        <article className="metric-card metric-card-products-total">
          <p className="metric-label">Role</p>
          <p className="metric-value">{role}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Organization</p>
          <p className="metric-value">{organizationName}</p>
        </article>
        <article className="metric-card">
          <p className="metric-label">Active sessions</p>
          <p className="metric-value">{sessions.length}</p>
        </article>
      </div>

      <article className="data-card account-profile-card">
        <h3>Profile details</h3>
        <div className="account-kv-grid">
          <div className="account-kv-item">
            <p className="account-kv-label">Email</p>
            <p className="account-kv-value">{email}</p>
          </div>
          <div className="account-kv-item">
            <p className="account-kv-label">Role</p>
            <p className="account-kv-value">{role}</p>
          </div>
          <div className="account-kv-item">
            <p className="account-kv-label">User ID</p>
            <p className="account-kv-value account-kv-value-mono">{userId}</p>
          </div>
          <div className="account-kv-item">
            <p className="account-kv-label">Organization ID</p>
            <p className="account-kv-value account-kv-value-mono">
              {organizationId}
            </p>
          </div>
        </div>
      </article>

      <article className="data-card account-profile-card">
        <div className="panel-head panel-head-row">
          <div>
            <h3>Session management</h3>
            <p className="event-sub">
              Review active devices and revoke sessions when needed.
            </p>
          </div>
          <div className="obs-actions">
            <button
              type="button"
              className="btn-ghost aligned-action-btn"
              onClick={loadSessions}
              disabled={sessionsLoading}
            >
              {sessionsLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <button
              type="button"
              className="btn-ghost"
              onClick={handleLogoutOthers}
              disabled={sessionsLoading || sessions.length <= 1}
            >
              Log out other devices
            </button>
          </div>
        </div>

        {sessionsError ? <p className="form-error">{sessionsError}</p> : null}
        {sessionsNotice ? (
          <p className="section-note">{sessionsNotice}</p>
        ) : null}

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Current</th>
                <th>Device</th>
                <th>IP</th>
                <th>Last used</th>
                <th>Started</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length ? (
                sessions.map((session) => (
                  <tr key={session.sessionId}>
                    <td>{session.current ? 'Yes' : 'No'}</td>
                    <td>
                      {valueOrDash(
                        session.deviceId || session.userAgent || 'Unknown'
                      )}
                    </td>
                    <td>{valueOrDash(session.ipAddress)}</td>
                    <td>{formatDateTime(session.lastUsedAt)}</td>
                    <td>{formatDateTime(session.createdAt)}</td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost btn-inline"
                        onClick={() => handleRevoke(session.sessionId)}
                      >
                        Revoke
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>No active sessions found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </article>

      <article className="data-card account-profile-card">
        <div className="panel-head panel-head-row">
          <div>
            <h3>Two-factor authentication</h3>
            <p className="event-sub">
              Secure your account with authenticator codes and recovery codes.
            </p>
          </div>
          <div className="obs-actions">
            <button
              type="button"
              className="btn-ghost aligned-action-btn"
              onClick={loadTwoFactorStatus}
              disabled={twoFactorLoading}
            >
              Refresh status
            </button>
          </div>
        </div>

        <div className="obs-grid settings-inline-grid">
          <div className="obs-item">
            <p className="metric-label">Enabled</p>
            <p className="obs-value">
              {twoFactorStatus.enabled ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="obs-item">
            <p className="metric-label">Pending setup</p>
            <p className="obs-value">
              {twoFactorStatus.pendingSetup ? 'Yes' : 'No'}
            </p>
          </div>
          <div className="obs-item">
            <p className="metric-label">Recovery codes left</p>
            <p className="obs-value">
              {Number(twoFactorStatus.remainingRecoveryCodes || 0)}
            </p>
          </div>
          <div className="obs-item">
            <p className="metric-label">Enabled at</p>
            <p className="obs-value">
              {formatDateTime(twoFactorStatus.enabledAt)}
            </p>
          </div>
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Current password</span>
            <input
              type="password"
              value={twoFactorPassword}
              onChange={(event) => setTwoFactorPassword(event.target.value)}
              placeholder="Required for all 2FA actions"
            />
          </label>
          <label className="settings-field">
            <span>Authenticator code</span>
            <input
              type="text"
              value={twoFactorCode}
              onChange={(event) => setTwoFactorCode(event.target.value)}
              placeholder="123456"
            />
          </label>
          <label className="settings-field">
            <span>Recovery code</span>
            <input
              type="text"
              value={twoFactorRecoveryCode}
              onChange={(event) => setTwoFactorRecoveryCode(event.target.value)}
              placeholder="AB12C-34D5E"
            />
          </label>
        </div>

        <div className="obs-actions account-twofactor-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleSetupTwoFactor}
            disabled={twoFactorLoading}
          >
            {twoFactorLoading ? 'Working...' : 'Start setup'}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={handleEnableTwoFactor}
            disabled={twoFactorLoading}
          >
            Enable 2FA
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleRegenerateRecoveryCodes}
            disabled={twoFactorLoading || !twoFactorStatus.enabled}
          >
            Regenerate recovery codes
          </button>
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDisableTwoFactor}
            disabled={twoFactorLoading || !twoFactorStatus.enabled}
          >
            Disable 2FA
          </button>
        </div>

        {twoFactorError ? <p className="form-error">{twoFactorError}</p> : null}
        {twoFactorNotice ? (
          <p className="section-note">{twoFactorNotice}</p>
        ) : null}

        {Array.isArray(twoFactorSetupData?.recoveryCodes) &&
        twoFactorSetupData.recoveryCodes.length ? (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Recovery codes (store safely)</th>
                </tr>
              </thead>
              <tbody>
                {twoFactorSetupData.recoveryCodes.map((entry) => (
                  <tr key={entry}>
                    <td className="account-kv-value-mono">{entry}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </article>

      <article className="data-card account-profile-card">
        <div className="panel-head panel-head-row">
          <div>
            <h3>Compliance tools</h3>
            <p className="event-sub">
              Export organization data, deactivate your account, and owner-only
              organization deactivation.
            </p>
          </div>
        </div>

        <div className="obs-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleExportCompliance}
            disabled={complianceLoading}
          >
            Download org export (JSON)
          </button>
        </div>

        <div className="settings-grid">
          <label className="settings-field">
            <span>Deactivate my account password</span>
            <input
              type="password"
              value={deleteAccountPassword}
              onChange={(event) => setDeleteAccountPassword(event.target.value)}
              placeholder="Current password"
            />
          </label>
        </div>

        <div className="obs-actions account-compliance-actions">
          <button
            type="button"
            className="btn-ghost"
            onClick={handleDeleteMyAccount}
            disabled={complianceLoading}
          >
            Deactivate my account
          </button>
        </div>

        {canDeleteOrganization ? (
          <>
            <div className="settings-grid">
              <label className="settings-field">
                <span>Owner password</span>
                <input
                  type="password"
                  value={deleteOrgPassword}
                  onChange={(event) => setDeleteOrgPassword(event.target.value)}
                  placeholder="Current password"
                />
              </label>
              <label className="settings-field">
                <span>Confirmation text</span>
                <input
                  type="text"
                  value={deleteOrgConfirmation}
                  onChange={(event) =>
                    setDeleteOrgConfirmation(event.target.value)
                  }
                  placeholder="DELETE ORG-CODE"
                />
              </label>
            </div>
            <div className="obs-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleDeleteOrganization}
                disabled={complianceLoading}
              >
                Deactivate organization
              </button>
            </div>
          </>
        ) : null}

        {complianceError ? (
          <p className="form-error">{complianceError}</p>
        ) : null}
        {complianceNotice ? (
          <p className="section-note">{complianceNotice}</p>
        ) : null}
      </article>
    </section>
  );
};

export default Account;
