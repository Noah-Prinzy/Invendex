import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button.js';

const TAB_ICONS = Object.freeze({
  dashboard: 'D',
  purchaseOrders: 'PO',
  products: 'P',
  stocktakes: 'ST',
  warehouses: 'W',
  suppliers: 'S',
  reports: 'R',
  users: 'U',
  account: 'A',
  settings: 'S'
});

const focusTabAt = (buttonRefs, index) => {
  const button = buttonRefs.current[index];
  if (button && !button.disabled) button.focus();
};

const findEnabledIndex = (tabs, startIndex, direction) => {
  const count = tabs.length;
  for (let step = 1; step <= count; step += 1) {
    const index = (startIndex + direction * step + count) % count;
    if (!tabs[index]?.disabled) return index;
  }
  return startIndex;
};

const TabBar = ({ tabs = [], activeTab, onChange = () => {} }) => {
  const buttonRefs = useRef([]);
  const toggleRef = useRef(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  buttonRefs.current = [];

  useEffect(() => setIsOpen(false), [activeTab]);

  if (!tabs.length) return null;

  const activeIndex = tabs.findIndex((tab) => tab.key === activeTab);
  const activeLabel = tabs[activeIndex]?.label || 'Navigation';

  const selectTab = (key) => {
    onChange(key);
    setIsOpen(false);
  };

  const handleKeyDown = (event, index) => {
    let nextIndex = null;
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        nextIndex = findEnabledIndex(tabs, index, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        nextIndex = findEnabledIndex(tabs, index, -1);
        break;
      case 'Home':
        nextIndex = findEnabledIndex(tabs, -1, 1);
        break;
      case 'End':
        nextIndex = findEnabledIndex(tabs, tabs.length, -1);
        break;
      case 'Escape':
        event.preventDefault();
        setIsOpen(false);
        toggleRef.current?.focus();
        return;
      default:
        return;
    }

    if (nextIndex === null || nextIndex === index) return;
    event.preventDefault();
    focusTabAt(buttonRefs, nextIndex);
    selectTab(tabs[nextIndex].key);
  };

  return (
    <div className={`navigation-shell ${isCollapsed ? 'is-collapsed' : ''}`}>
      <div className="sidebar-toggle-row">
        <button
          type="button"
          className="sidebar-collapse"
          aria-label={isCollapsed ? 'Expand navigation' : 'Collapse navigation'}
          aria-pressed={isCollapsed}
          onClick={() => setIsCollapsed((collapsed) => !collapsed)}
        >
          <span className="sidebar-menu-icon" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </div>

      <Button
        type="button"
        ref={toggleRef}
        className="nav-toggle"
        aria-expanded={isOpen}
        aria-controls="primary-navigation"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span>{activeLabel}</span>
        <span className="nav-toggle-icon" aria-hidden="true">
          {isOpen ? 'Close' : 'Menu'}
        </span>
      </Button>

      <nav
        id="primary-navigation"
        className={'tabbar ' + (isOpen ? 'open' : '')}
        aria-label="Primary"
        data-tutorial-id="app-tabbar"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.key === activeTab;
          const isFocusable = activeIndex === -1 ? index === 0 : isActive;

          return (
            <Button
              type="button"
              key={tab.key}
              ref={(element) => {
                buttonRefs.current[index] = element;
              }}
              className={
                'tab ' +
                (isActive ? 'active ' : '') +
                (tab.disabled ? 'disabled' : '')
              }
              onClick={() => !tab.disabled && selectTab(tab.key)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              disabled={tab.disabled}
              aria-current={isActive ? 'page' : undefined}
              aria-disabled={tab.disabled || undefined}
              tabIndex={isFocusable ? 0 : -1}
              title={tab.title || tab.label}
            >
              <span className="tab-icon" aria-hidden="true">
                {tab.icon || TAB_ICONS[tab.key] || '•'}
              </span>
              <span className="tab-label">{tab.label}</span>
              {tab.badge !== undefined &&
              tab.badge !== null &&
              tab.badge !== '' ? (
                <span className="tab-badge">{tab.badge}</span>
              ) : null}
            </Button>
          );
        })}
      </nav>
    </div>
  );
};

export default TabBar;
