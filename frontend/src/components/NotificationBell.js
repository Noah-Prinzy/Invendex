import { useEffect, useMemo, useRef, useState } from 'react';
import Button from '../ui/Button.js';

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
  const shellRef = useRef(null);
  const unreadBadge = count > 99 ? '99+' : String(count);
  const hasItems = Array.isArray(items) && items.length > 0;

  const title = useMemo(
    () =>
      count > 0
        ? `${count} unread notification${count === 1 ? '' : 's'}`
        : 'Notifications',
    [count]
  );

  useEffect(() => {
    if (!isOpen) return undefined;

    const handleClickOutside = (event) => {
      if (!shellRef.current) return;
      if (!shellRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  return (
    <div className="notification-shell" ref={shellRef}>
      <Button
        type="button"
        className="notification-bell"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={() => setIsOpen((current) => !current)}
        title={title}
      >
        <span className="bell-icon" aria-hidden="true">
          N
        </span>
        <span className="bell-count">{unreadBadge}</span>
      </Button>

      {isOpen ? (
        <section
          className="notification-panel"
          role="dialog"
          aria-modal="false"
        >
          <header className="notification-panel-head">
            <h3>Notifications</h3>
            <div className="notification-panel-actions">
              <Button type="button" variant="ghost" onClick={onRefresh}>
                {isLoading ? 'Loading...' : 'Refresh'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={onMarkAllRead}
                disabled={!count}
              >
                Mark all read
              </Button>
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
                      <Button
                        type="button"
                        variant="ghost"
                        className="btn-inline"
                        onClick={() => onMarkRead(item?._id || item?.id)}
                      >
                        Mark read
                      </Button>
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
