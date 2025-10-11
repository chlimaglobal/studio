
import type {NextConfig} from 'next';

const isDev = process.env.NODE_ENV === "development";
const isTurbopack = !!process.env.TURBOPACK;

const withPWA = require('next-pwa')({
    dest: "public",
    register: true,
    skipWaiting: true,
    // Disable PWA in development to avoid issues with HMR
    disable: isDev, 
});

const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: {
    allowedDevOrigins: [
      "*.cluster-qhrn7lb3szcfcud6uanedbkjnm.cloudworkstations.dev"
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: false,
    dangerouslyAllowSVG: true,
    contentDispositionType: 'attachment',
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
       {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

// Conditionally apply PWA wrapper. It's not compatible with Turbopack.
const finalConfig = isTurbopack ? nextConfig : withPWA(nextConfig);

module.exports = finalConfig;
