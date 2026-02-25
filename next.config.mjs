/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de TypeScript durante o build
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora erros de ESLint durante o build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // ✅ Firebase App Hosting = SSR (REMOVER 'export')
  output: 'standalone',  // ✅ CORRETO para Firebase
  distDir: '.next-frontend',  // ✅ Firebase espera isso
  trailingSlash: false,  // ✅ Sem trailing slash
  images: {
    unoptimized: true  // ✅ Necessário para Firebase
  },
  // ✅ Fix assets path
  assetPrefix: '',
  basePath: '',
};

export default nextConfig;
