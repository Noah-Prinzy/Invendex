import { useMemo, useState } from 'react';

const formatDateTime = (value) => {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Unknown';
  return date.toLocaleString();
};

const NotificationBell = ({
  count = 0,
  items = [],
  isLoading = false,
  onRefresh = () => {},
  onMarkAllRead = () => {},
  onMarkRead = () => {}
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const unreadBadge = count > 99 ? '99+' : String(count);
  const hasItems = Array.isArray(items) && items.length > 0;

  const title = useMemo(
    () =>
      count > 0
        ? `${count} unread notification${count === 1 ? '' : 's'}`
        : 'Notifications',
    [count]
  );

  return (
    <div className="notification-shell">
      <button
        type="button"
        className="notification-bell"
        aria-label="Notifications"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        title={title}
      >
        <span className="bell-icon" aria-hidden="true">
          N
        </span>
        <span className="bell-count">{unreadBadge}</span>
      </button>

      {isOpen ? (
        <section className="notification-panel" role="dialog">
          <header className="notification-panel-head">
            <h3>Notifications</h3>
            <div className="notification-panel-actions">
              <button type="button" className="btn-ghost" onClick={onRefresh}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={onMarkAllRead}
                disabled={!count}
              >
                Mark all read
              </button>
            </div>
          </header>

          {!hasItems ? (
            <p className="event-sub notification-empty">
              {isLoading ? 'Loading notifications...' : 'No notifications yet.'}
            </p>
          ) : (
            <ul className="notification-list">
              {items.map((item) => (
                <li
                  key={item?._id || item?.id}
                  className={`notification-item ${item?.read ? 'read' : 'unread'}`}
                >
                  <div className="notification-item-main">
                    <p className="notification-item-title">
                      {String(item?.title || 'Notification')}
                    </p>
                    <p className="notification-item-message">
                      {String(item?.message || '')}
                    </p>
                    <p className="notification-item-meta">
                      {formatDateTime(item?.createdAt)} |{' '}
                      {String(item?.severity || 'info')}
                    </p>
                  </div>
                  <div className="notification-item-actions">
                    {!item?.read ? (
                      <button
                        type="button"
                        className="btn-ghost btn-inline"
                        onClick={() => onMarkRead(item?._id || item?.id)}
                      >
                        Mark read
                      </button>
                    ) : (
                      <span className="section-note">Read</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
};

export default NotificationBell;
