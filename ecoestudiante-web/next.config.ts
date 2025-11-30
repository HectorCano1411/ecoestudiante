import type { NextConfig } from 'next';
import withPWA from 'next-pwa';

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Configuración para PWA y Docker
  output: 'standalone',

  // CRÍTICO: Deshabilitar prefetch completamente (evita CORS con Auth0)
  experimental: {
    // @ts-ignore - Esta opción existe pero puede no estar en los tipos
    disableOptimizedLoading: true,
  },

  // CRÍTICO: Deshabilitar prefetch de rutas Auth0 (evita CORS)
  async headers() {
    return [
      {
        source: '/api/auth/:path*',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow',
          },
          // Indica a Next.js que NO haga prefetch de estas rutas
          {
            key: 'Cache-Control',
            value: 'no-store, must-revalidate',
          },
          // CRÍTICO: Bloquear CORS para evitar prefetch
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ];
  },

  // Proxy /api/* -> Gateway Spring Cloud Gateway (puerto 8888)
  // NOTA: Los route handlers de Next.js usan backendFetch que apunta al Gateway
  // Estos rewrites son para casos donde el frontend llama directamente (no recomendado)
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: 'http://localhost:8888/api/v1/:path*', // Gateway, no backend directo
      },
      // NO reescribir /api/auth/[...auth0]/* - Auth0 lo maneja
      // Solo reescribir rutas específicas del backend JWT (a través del Gateway)
      {
        source: '/api/auth/jwt-login',
        destination: 'http://localhost:8888/api/v1/auth/login', // Gateway
      },
      {
        source: '/api/auth/register',
        destination: 'http://localhost:8888/api/v1/auth/register', // Gateway
      },
      {
        source: '/api/auth/verify-email',
        destination: 'http://localhost:8888/api/v1/auth/verify-email', // Gateway
      },
      {
        source: '/api/auth/forgot-password',
        destination: 'http://localhost:8888/api/v1/auth/forgot-password', // Gateway
      },
      // NOTA: /api/auth/reset-password tiene un route handler específico (route.ts)
      // No necesita rewrite ya que el route handler lo maneja directamente
      {
        source: '/api/stats/:path*',
        destination: 'http://localhost:8888/api/v1/calc/stats/:path*', // Gateway + nueva ruta
      },
      {
        source: '/api/calc/:path*',
        destination: 'http://localhost:8888/api/v1/calc/:path*', // Gateway
      },
    ];
  },
};

// Configuración PWA
const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Deshabilitar en desarrollo
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offlineCache',
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
});

export default pwaConfig(nextConfig);
