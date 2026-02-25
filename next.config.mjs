/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true
  },
  output: 'standalone',
  distDir: '.next-frontend',
  trailingSlash: true
};

export default nextConfig;
