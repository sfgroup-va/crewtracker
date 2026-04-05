import type { NextConfig } from "next";

const nextConfig: NextConfig = {

  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["https://preview-chat-c0d10c9b-cda8-41d4-b7c7-3e6de80f5a92.space.z.ai"],
};

export default nextConfig;
