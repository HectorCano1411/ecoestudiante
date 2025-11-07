import { handleAuth, handleLogin, handleLogout } from '@auth0/nextjs-auth0';

// Configuración de Auth0 handlers
const authHandlers = handleAuth({
  login: handleLogin({
    authorizationParams: {
      audience: process.env.AUTH0_AUDIENCE,
      scope: 'openid profile email read:carbon write:carbon',
    },
    returnTo: '/dashboard', // Redirigir al dashboard principal después del login exitoso
  }),
  logout: handleLogout({
    returnTo: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  }),
});

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
  // Resolver params antes de pasar al handler
  // Esto es crítico en Next.js 15 para evitar el error de "params should be awaited"
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
  // Resolver params antes de pasar al handler
  const resolvedParams = await params;
  
  return authHandlers(req, { params: resolvedParams });
}
