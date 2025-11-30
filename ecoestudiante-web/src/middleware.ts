import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ========================================================================
  // LISTA DE RUTAS PÚBLICAS (no requieren autenticación)
  // ========================================================================
  const publicPaths = [
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password',
    '/verify-email',
    '/api/auth', // Todos los endpoints de Auth0
  ];

  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // ========================================================================
  // DETECTAR PREFETCH DE NEXT.JS (React Server Components)
  // ========================================================================
  // Cuando Next.js hace prefetch, envía headers específicos:
  // - RSC: 1
  // - Next-Router-Prefetch: 1
  // - Purpose: prefetch
  //
  // SOLUCIÓN: Si es un prefetch, NO verificar autenticación para evitar
  // redirects que causen errores CORS con Auth0
  // ========================================================================

  const isPrefetch =
    request.headers.get('purpose') === 'prefetch' ||
    request.headers.get('x-nextjs-data') !== null ||
    request.headers.get('rsc') === '1' ||
    request.headers.get('next-router-prefetch') === '1';

  if (isPrefetch) {
    // Permitir prefetch sin verificación para evitar CORS
    // La verificación real se hará cuando el usuario navegue de verdad
    console.log(`[Middleware] Prefetch detectado para ${pathname}, permitiendo sin verificación`);
    return NextResponse.next();
  }

  // ========================================================================
  // VERIFICACIÓN DE SESIÓN AUTH0 (solo para navegación real)
  // ========================================================================
  // Verificar si existe la cookie de sesión de Auth0
  // La cookie se llama 'appSession' por defecto en @auth0/nextjs-auth0
  // ========================================================================

  const auth0Cookie = request.cookies.get('appSession');
  const jwtToken = request.cookies.get('authToken'); // JWT tradicional (fallback)
  const jwtTokenLocalStorage = request.headers.get('authorization'); // JWT desde header

  // Si no hay ninguna sesión (ni Auth0 ni JWT)
  if (!auth0Cookie && !jwtToken && !jwtTokenLocalStorage) {
    // ========================================================================
    // IMPORTANTE: NO redirigir a login desde el middleware
    // Dejar que el cliente (página) maneje la redirección
    // Esto evita problemas con CORS en requests RSC/prefetch
    // ========================================================================
    const response = NextResponse.next();
    response.headers.set('x-auth-required', 'true');
    console.log(`[Middleware] No hay sesión para ${pathname}, permitiendo acceso (cliente manejará redirección)`);
    return response;
  }

  // Si hay sesión, continuar normalmente
  console.log(`[Middleware] Sesión válida detectada para ${pathname}`);
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api/auth/* (Auth0 routes - CRITICAL: evita CORS)
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|api/auth|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
