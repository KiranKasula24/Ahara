import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd()),
  webpack: (config, { dev }) => {
    // This repository is stored in a synchronised OneDrive folder. Keeping the
    // development cache in memory avoids stale on-disk chunks being reused.
    if (dev) config.cache = false;
    return config;
  },
};
export default nextConfig;
