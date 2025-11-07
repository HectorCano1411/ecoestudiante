import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Proxy /api/* -> backend Spring Boot (puerto 18080)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:18080/api/v1/:path*',
      },
      // NO reescribir /api/auth/[...auth0]/* - Auth0 lo maneja
      // Solo reescribir rutas específicas del backend JWT
      {
        source: '/api/auth/jwt-login',
        destination: 'http://localhost:18080/api/v1/auth/login',
      },
      {
        source: '/api/auth/register',
        destination: 'http://localhost:18080/api/v1/auth/register',
      },
      {
        source: '/api/auth/verify-email',
        destination: 'http://localhost:18080/api/v1/auth/verify-email',
      },
      {
        source: '/api/auth/forgot-password',
        destination: 'http://localhost:18080/api/v1/auth/forgot-password',
      },
      {
        source: '/api/auth/reset-password',
        destination: 'http://localhost:18080/api/v1/auth/reset-password',
      },
      {
        source: '/api/stats/:path*',
        destination: 'http://localhost:18080/api/v1/stats/:path*',
      },
      {
        source: '/api/calc/:path*',
        destination: 'http://localhost:18080/api/v1/calc/:path*',
      },
    ];
  },
};

export default nextConfig;
