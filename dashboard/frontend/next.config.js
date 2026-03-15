/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Proxy /api requests to the Express backend during development
  async rewrites() {
    return process.env.NODE_ENV === 'development'
      ? [{ source: '/api/:path*', destination: 'http://localhost:3000/api/:path*' }]
      : [];
  },
};

module.exports = nextConfig;
