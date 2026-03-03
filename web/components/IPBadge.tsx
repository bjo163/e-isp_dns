import React from "react";
import { useIPInfo } from "../hooks/useIPInfo";

interface Props {
  ip: string | undefined;
  className?: string;
}

export const IPBadge: React.FC<Props> = ({ ip, className }) => {
  const { info, loading, error } = useIPInfo(ip);

  if (!ip) return null;
  if (loading) return <span className={className}>🔄 {ip}</span>;
  if (error) return <span className={className} title={error}>⚠️ {ip}</span>;
  if (!info) return <span className={className}>{ip}</span>;

  return (
    <span className={className} title={`ISP: ${info.isp || "-"}\nASN: ${info.asn || "-"}\nCountry: ${info.country || "-"}\nCity: ${info.city || "-"}`}>
      🌐 {ip}
      {info.country_code && (
        <span style={{ marginLeft: 4 }}>{info.country_code} </span>
      )}
      {info.isp && (
        <span style={{ marginLeft: 4, color: "#888" }}>{info.isp}</span>
      )}
    </span>
  );
};
