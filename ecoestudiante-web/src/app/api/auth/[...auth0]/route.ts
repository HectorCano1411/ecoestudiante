import { handleAuth, handleLogin, handleLogout } from '@auth0/nextjs-auth0';
import { NextResponse } from 'next/server';

// Verificar si Auth0 está COMPLETAMENTE configurado
const isAuth0Enabled = Boolean(
  process.env.AUTH0_SECRET &&
  process.env.AUTH0_CLIENT_ID &&
  process.env.AUTH0_CLIENT_SECRET &&
  process.env.AUTH0_ISSUER_BASE_URL
);

console.log('[Auth0] Configuration status:', {
  enabled: isAuth0Enabled,
  hasSecret: !!process.env.AUTH0_SECRET,
  hasClientId: !!process.env.AUTH0_CLIENT_ID,
  hasClientSecret: !!process.env.AUTH0_CLIENT_SECRET,
  hasIssuer: !!process.env.AUTH0_ISSUER_BASE_URL,
});

// Solo inicializar Auth0 handlers si está completamente configurado
const authHandlers = isAuth0Enabled
  ? handleAuth({
      login: handleLogin({
        authorizationParams: {
          audience: process.env.AUTH0_AUDIENCE,
          scope: process.env.AUTH0_SCOPE || 'openid profile email read:carbon write:carbon report:write',
        },
        returnTo: '/dashboard',
      }),
      logout: handleLogout({
        returnTo: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
      }),
    })
  : null;

/**
 * Handler GET para Auth0
 *
 * En Next.js 15, params es una Promise y debe ser awaited antes de usarse.
 * handleAuth de @auth0/nextjs-auth0 necesita los params para determinar
 * qué ruta específica se está llamando (login, logout, callback, etc.).
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ auth0?: string[] }> }
) {
  // Si Auth0 no está configurado, retornar mensaje informativo
  if (!isAuth0Enabled || !authHandlers) {
    return NextResponse.json(
      {
        error: 'AUTH0_NOT_CONFIGURED',
        message: 'Auth0 authentication is not enabled. Please configure all required Auth0 environment variables or use JWT login at /login',
        requiredVars: ['AUTH0_SECRET', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH0_ISSUER_BASE_URL'],
        alternativeLogin: '/login'
      },
      { status: 501 }
    );
  }

  // Resolver params antes de pasar al handler
  const resolvedParams = await params;

  // handleAuth espera un Request y opcionalmente un contexto con params
  return authHandlers(req, { params: resolvedParams });
}

/**
 * Handler POST para Auth0
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ auth0?: string[] }> }
) {
  // Si Auth0 no está configurado, retornar mensaje informativo
  if (!isAuth0Enabled || !authHandlers) {
    return NextResponse.json(
      {
        error: 'AUTH0_NOT_CONFIGURED',
        message: 'Auth0 authentication is not enabled. Please configure all required Auth0 environment variables or use JWT login at /login',
        requiredVars: ['AUTH0_SECRET', 'AUTH0_CLIENT_ID', 'AUTH0_CLIENT_SECRET', 'AUTH0_ISSUER_BASE_URL'],
        alternativeLogin: '/login'
      },
      { status: 501 }
    );
  }

  // Resolver params antes de pasar al handler
  const resolvedParams = await params;

  return authHandlers(req, { params: resolvedParams });
}
