import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow LAN dev access without warnings
  allowedDevOrigins: ["192.168.31.176"],
};

export default nextConfig;
