/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['@anthropic-ai/sdk'],
  },
  // Increase payload size limit for large AI responses
  api: {
    responseLimit: false,
  },
};

module.exports = nextConfig;
