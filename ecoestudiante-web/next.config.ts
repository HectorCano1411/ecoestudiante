// next.config.ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Opcional: buenas prácticas en dev
  reactStrictMode: true,

  // Proxy /api/* -> backend Spring Boot (puerto 18080)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:18080/:path*',
      },
    ];
  },
};

export default nextConfig;
