
import type {NextConfig} from 'next';

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
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply this header to all routes in your application.
        source: '/:path*',
        headers: [
          {
            key: 'Permissions-Policy',
            // This policy allows the creation of public-key credentials.
            value: 'publickey-credentials-create=*',
          },
        ],
      },
    ];
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
};

export default nextConfig;
