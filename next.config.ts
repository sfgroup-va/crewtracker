import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // output: "standalone", // Disabled for dev - standalone removes BUILD_ID needed by next start
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["https://preview-chat-c0d10c9b-cda8-41d4-b7c7-3e6de80f5a92.space.z.ai"],
};

export default nextConfig;
