import React from "react";
import { getDNSConfig, DNSConfig } from "../../lib/api-client";

export const SettingsTab: React.FC = () => {
  const [config, setConfig] = React.useState<DNSConfig | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getDNSConfig()
      .then(setConfig)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">DNS Settings</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500">{error}</div>}
      {config && (
        <div className="space-y-2">
          <div><b>Listen Address:</b> {config.listen_addr}</div>
          <div><b>Upstream DNS:</b> {config.upstream_dns}</div>
          <div><b>Redirect IP:</b> {config.redirect_ip}</div>
          <div><b>HTTP Port:</b> {config.http_port}</div>
          <div><b>Intercept Port:</b> {config.intercept_port}</div>
          <div><b>ACL Default Allow:</b> {config.acl_default_allow ? "Yes" : "No"}</div>
        </div>
      )}
    </div>
  );
};