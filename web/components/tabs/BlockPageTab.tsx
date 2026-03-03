import React from "react";
import { getBranding } from "../../lib/api-client";

export const BlockPageTab: React.FC = () => {
  const [branding, setBranding] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    getBranding()
      .then(setBranding)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Block Page Settings</h2>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500">{error}</div>}
      {branding && (
        <div className="space-y-2">
          <div><b>Block Page URL:</b> {branding.block_page_url}</div>
          <div><b>Hero Title:</b> {branding.hero_title}</div>
          <div><b>Hero Subtitle:</b> {branding.hero_subtitle}</div>
          <div><b>Notice Text:</b> {branding.notice_text}</div>
          <div><b>Footer Legal:</b> {branding.footer_legal}</div>
        </div>
      )}
    </div>
  );
}