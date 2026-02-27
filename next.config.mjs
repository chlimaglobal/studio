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
  trailingSlash: false, // ✅ Firebase App Hosting prefere false
  
  // ✅ FIX Firebase SDK warning (encoding/node-fetch)
  webpack: (config) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      encoding: false,
    };
    return config;
  },
  
  // ✅ Mantém Firebase SDK fora do bundle do browser
  experimental: {
    serverComponentsExternalPackages: ['firebase', '@firebase/auth', '@firebase/firestore'],
  },
  
  images: {
    unoptimized: true  // ✅ Necessário pro Firebase
  }
};

export default nextConfig;
