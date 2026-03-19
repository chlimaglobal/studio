/** @type {import('next').NextConfig} */
const nextConfig = {
  // ✅ Firebase App Hosting padrão
  output: 'standalone',
  distDir: '.next',

  // ✅ Firebase Hosting compatível
  trailingSlash: true,

  images: {
    unoptimized: true
  },

  // ✅ TypeScript: ignora erros de build (mantido)
  typescript: {
    ignoreBuildErrors: true
  },

  // ✅ FIX: allowedDevOrigins movido para raiz (Next.js 16 — saiu de experimental)
  allowedDevOrigins: [
    '6000-firebase-studio-*.cluster-*.cloudworkstations.dev',
    '9000-firebase-studio-*.cluster-*.cloudworkstations.dev'
  ]

  // ✅ FIX: eslint removido — não é mais suportado no next.config.mjs no Next.js 16
  // Para ignorar ESLint no build, use a flag: next build --no-lint
  // ou configure no package.json: "build": "next build --no-lint"
};

export default nextConfig;
