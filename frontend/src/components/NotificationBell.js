import React from 'react';

const NotificationBell = ({ count = 0, onClick = null }) => (
  <button
    type="button"
    className="notification-bell"
    aria-label="Notifications"
    onClick={onClick || undefined}
    title="Clear unread realtime events"
  >
    <span className="bell-icon" aria-hidden="true">
      N
    </span>
    <span className="bell-count">{count > 99 ? '99+' : count}</span>
  </button>
);

export default NotificationBell;
