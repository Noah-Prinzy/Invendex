import React from 'react';

const TabBar = ({ tabs, activeTab, onChange }) => (
  <nav className="tabbar" aria-label="Primary">
    {tabs.map(tab => (
      <button
        type="button"
        key={tab.key}
        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
        onClick={() => onChange(tab.key)}
      >
        {tab.label}
      </button>
    ))}
  </nav>
);

export default TabBar;
