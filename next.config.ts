import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.ctfassets.net",
      },
      {
        protocol: "https",
        hostname: "assets.ctfassets.net",
      },
    ],
  },
  // Supabase deployment configuration
  output: 'standalone',
  serverExternalPackages: ['@supabase/supabase-js'],
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
