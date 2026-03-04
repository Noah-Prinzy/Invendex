const AuthLayout = ({
  eyebrow = 'Ledgerly',
  title = '',
  description = '',
  children
}) => (
  <main className="auth-layout">
    <section className="auth-intro">
      <p className="eyebrow">{eyebrow}</p>
      <h2>{title}</h2>
      <p>{description}</p>
    </section>
    {children}
  </main>
);

export default AuthLayout;
