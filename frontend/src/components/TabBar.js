import Button from '../ui/Button.js';

const TabBar = ({ tabs, activeTab, onChange }) => (
  <nav className="tabbar" aria-label="Primary" data-tutorial-id="app-tabbar">
    {tabs.map((tab) => (
      <Button
        type="button"
        key={tab.key}
        className={`tab ${activeTab === tab.key ? 'active' : ''}`}
        onClick={() => onChange(tab.key)}
        aria-current={activeTab === tab.key ? 'page' : undefined}
      >
        {tab.label}
      </Button>
    ))}
  </nav>
);

export default TabBar;
