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
  trailingSlash: true,  // ✅ Firebase App Hosting ESPERA true
  
  // ✅ FIX Firebase warning (só webpack, sem experimental)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
    };
    return config;
  },
  
  images: {
    unoptimized: true
  }
};

export default nextConfig;
