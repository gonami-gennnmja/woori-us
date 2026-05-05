import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  basePath: "/us",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/us",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
