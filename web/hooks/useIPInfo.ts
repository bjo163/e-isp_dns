import { useEffect, useState } from "react";
import { getIPInfo, IPEnrichment } from "../lib/api-client";

export function useIPInfo(ip: string | undefined) {
  const [info, setInfo] = useState<IPEnrichment | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ip) return;
    setLoading(true);
    setError(null);
    getIPInfo(ip)
      .then(setInfo)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ip]);

  return { info, loading, error };
}
