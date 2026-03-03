import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required for Docker multi-stage build (copies only what's needed)
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "trustpositif.komdigi.go.id",
        pathname: "/assets/images/**",
      },
      {
        protocol: "https",
        hostname: "db-1.apps.mycocolink.com",
        pathname: "/api/files/**",
      },
    ],
  },
};

export default nextConfig;
