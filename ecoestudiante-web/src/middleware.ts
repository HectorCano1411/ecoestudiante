import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Rutas públicas
  const publicPaths = ['/login', '/register', '/api/auth'];
  const isPublicPath = publicPaths.some(path => request.nextUrl.pathname.startsWith(path));

  if (isPublicPath) {
    return NextResponse.next();
  }

  // Para rutas protegidas, Auth0 manejará la autenticación
  // El frontend se encargará de redirigir si no hay sesión
  return NextResponse.next();
}

export const config = {
  matcher: [
    // protege todo excepto login, registro, estáticos y la API de auth (Auth0)
    "/((?!login|register|_next/static|_next/image|favicon.ico|api/auth).*)",
  ],
};
