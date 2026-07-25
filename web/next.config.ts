import type { NextConfig } from "next";

const backendOrigin = process.env.BACKEND_API_URL || "http://localhost:3030";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      { source: "/galaxies/:path*", destination: `${backendOrigin}/galaxies/:path*` },
      { source: "/gallary/:path*", destination: `${backendOrigin}/gallary/:path*` },
    ];
  },
};

export default nextConfig;
