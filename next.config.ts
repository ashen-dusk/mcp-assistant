import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: '**.gstatic.com',
      },
    ],
  },
  trustHost: true,

  reactStrictMode: true,
  swcMinify: true,
  poweredByHeader: false,
};

export default nextConfig;
