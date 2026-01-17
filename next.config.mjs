
import nextPWA from '@ducanh2912/next-pwa';

const withPWA = nextPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Adicionado para resolver o conflito entre Turbopack e Webpack do PWA
  experimental: {
    turbo: {},
  },
};

export default withPWA(nextConfig);
