import React from "react";
import { getQueryLog, QueryLogEntry } from "../../lib/api-client";
import { IPBadge } from "../IPBadge";

export const QueryLogTab: React.FC = () => {
  const [logs, setLogs] = React.useState<QueryLogEntry[]>([]);
  const [total, setTotal] = React.useState(0);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getQueryLog({ page: 1, limit: 100 })
      .then((res) => {
        setLogs(res.data);
        setTotal(res.total);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Query Log</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500">{error}</div>}
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs border">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-2">Time</th>
              <th className="p-2">Domain</th>
              <th className="p-2">Type</th>
              <th className="p-2">Action</th>
              <th className="p-2">Client</th>
              <th className="p-2">Latency (μs)</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id} className="border-b">
                <td className="p-2 whitespace-nowrap">{new Date(l.created_at).toLocaleString()}</td>
                <td className="p-2">{l.domain}</td>
                <td className="p-2">{l.qtype}</td>
                <td className="p-2">{l.action}</td>
                <td className="p-2"><IPBadge ip={l.client} /></td>
                <td className="p-2 text-right">{l.latency_us}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-2 text-xs text-gray-500">Total: {total}</div>
      </div>
    </div>
  );
};
