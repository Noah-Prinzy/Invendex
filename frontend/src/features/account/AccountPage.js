import React from 'react';

const Account = ({ user }) => (
  <section className="panel">
    <header className="panel-head">
      <div>
        <h2>Account</h2>
        <p>User identity and organization profile context.</p>
      </div>
    </header>
    <article className="event-card">
      <h3>Current session</h3>
      <pre>{JSON.stringify(user || {}, null, 2)}</pre>
    </article>
  </section>
);

export default Account;
