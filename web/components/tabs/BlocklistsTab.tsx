import React from "react";
import { getPresets, BlocklistPreset } from "../../lib/api-client";

export const BlocklistsTab: React.FC = () => {
  const [presets, setPresets] = React.useState<BlocklistPreset[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getPresets()
      .then(setPresets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Blocklist Presets</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500">{error}</div>}
      <ul className="space-y-2">
        {presets.map((preset) => (
          <li key={preset.url} className="border rounded p-3">
            <div className="font-semibold">{preset.label}</div>
            <div className="text-sm text-gray-600">{preset.description}</div>
            <div className="text-xs text-gray-400">{preset.url}</div>
            <div className="text-xs">Kategori: {preset.category} | Format: {preset.format}</div>
          </li>
        ))}
      </ul>
    </div>
  );
};
