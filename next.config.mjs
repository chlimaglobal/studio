/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  eslint: {
    ignoreDuringBuilds: true
  },
  output: 'standalone',
  distDir: '.next-frontend',
  trailingSlash: true,
  // Ignora functions/ (Firebase backend)
  transpilePackages: []
};

export default nextConfig;
