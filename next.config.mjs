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
  // If you have other configurations, they should go here.
  // For example:
  // images: {
  //   domains: ['example.com'],
  // },
};

export default withPWA(nextConfig);
