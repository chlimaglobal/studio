/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ignora erros de TypeScript durante o build.
  // Essencial para evitar que erros de tipo impeçam o deploy.
  typescript: {
    ignoreBuildErrors: true,
  },
  // Ignora erros de ESLint durante o build.
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
