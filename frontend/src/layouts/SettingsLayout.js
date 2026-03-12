const SettingsLayout = ({
  title = 'Settings',
  description = '',
  actions = null,
  children
}) => (
  <section className="panel settings-panel" data-tutorial-id="settings-root">
    <header className="panel-head panel-head-row">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {actions ? <div className="obs-actions">{actions}</div> : null}
    </header>
    {children}
  </section>
);

export default SettingsLayout;
