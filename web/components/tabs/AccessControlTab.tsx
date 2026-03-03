import React from "react";
import { getClients, ACLClient, getDetectedClients, DetectedClient } from "../../lib/api-client";

export const AccessControlTab: React.FC = () => {
  const [clients, setClients] = React.useState<ACLClient[]>([]);
  const [detected, setDetected] = React.useState<DetectedClient[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    Promise.all([getClients(), getDetectedClients()])
      .then(([c, d]) => {
        setClients(c);
        setDetected(d);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Access Control (ACL)</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500">{error}</div>}
      <h3 className="font-semibold mt-4">Registered Clients</h3>
      <ul className="space-y-2">
        {clients.map((cl) => (
          <li key={cl.id} className="border rounded p-3">
            <div className="font-semibold">{cl.name || cl.ip}</div>
            <div className="text-xs text-gray-500">{cl.ip}</div>
            <div className="text-xs">Action: {cl.action} | Blocked: {cl.blocked_categories || "-"}</div>
            <div className="text-xs text-gray-400">{cl.notes}</div>
          </li>
        ))}
      </ul>
      <h3 className="font-semibold mt-6">Detected Clients (not registered)</h3>
      <ul className="space-y-2">
        {detected.map((d) => (
          <li key={d.ip} className="border rounded p-3 flex justify-between items-center">
            <span>{d.ip}</span>
            <span className="text-xs text-gray-500">{d.query_count} queries</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
