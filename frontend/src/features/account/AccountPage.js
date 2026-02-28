const valueOrDash = (value) => {
  const normalized = String(value || '').trim();
  return normalized || '-';
};

const formatRole = (role) => {
  const normalized = String(role || '').trim();
  if (!normalized) return '-';
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
};

const Account = ({ user }) => {
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

  return (
    <section className="panel">
      <header className="panel-head">
        <div>
          <h2>Account</h2>
          <p>User identity and organization profile context.</p>
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
          <p className="metric-label">Session</p>
          <p className="metric-value">Active</p>
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
    </section>
  );
};

export default Account;
