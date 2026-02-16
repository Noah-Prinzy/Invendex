import React, { useMemo, useState } from 'react';
import useDashboardRealtime from '../hooks/realtime/useDashboardRealtime.js';

const Dashboard = ({ accessToken, warehouseId = null }) => {
  const [lastInventoryEvent, setLastInventoryEvent] = useState(null);
  const [lastFinanceEvent, setLastFinanceEvent] = useState(null);

  const realtimeBaseUrl = useMemo(
    () => (typeof window !== 'undefined' ? window.location.origin : ''),
    []
  );

  useDashboardRealtime({
    baseUrl: realtimeBaseUrl,
    accessToken,
    warehouseId,
    onInventoryChange: payload => setLastInventoryEvent(payload),
    onValuationChange: payload => setLastFinanceEvent(payload),
    onCogsRecorded: payload => setLastFinanceEvent(payload)
  });

  return (
    <section>
      <h1>Dashboard</h1>
      <p>Realtime socket connected for inventory and finance events.</p>
      <pre>{JSON.stringify({ lastInventoryEvent, lastFinanceEvent }, null, 2)}</pre>
    </section>
  );
};

export default Dashboard;
