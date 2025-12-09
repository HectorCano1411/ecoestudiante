/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from 'next/server';
// import { getSession, getAccessToken } from '@auth0/nextjs-auth0'; // DESHABILITADO: Incompatible con Next.js 15
import { logger } from '@/lib/logger';

/**
 * Obtiene el token de autenticación de múltiples fuentes (Auth0 o JWT tradicional).
 *
 * AUTENTICACIÓN DUAL: Soporta ambos métodos sin conflictos
 *
 * ORDEN DE PRIORIDAD:
 * 1. Token JWT tradicional del header Authorization (más rápido y común)
 * 2. Token de Auth0 desde la sesión del servidor (si Auth0 está configurado)
 *
 * IMPORTANTE: Esta función solo funciona en Server Components y Route Handlers.
 *
 * @param req - NextRequest object from route handler
 * @returns Object with token, type, and userId
 */
export async function getAuthToken(req: NextRequest): Promise<{
  token: string | null;
  type: 'jwt' | 'auth0' | null;
  userId?: string;
}> {
  try {
    // ========================================================================
    // OPCIÓN 1: Token JWT tradicional del header (más rápido)
    // ========================================================================
    // Este método funciona para usuarios que hicieron login con /login
    const authHeader = req.headers.get('authorization') ||
                       req.headers.get('Authorization') ||
                       req.headers.get('AUTHORIZATION');

    logger.debug('auth-token', 'Checking for token in headers', {
      hasAuthHeader: !!authHeader,
      authHeaderLength: authHeader?.length,
      authHeaderPrefix: authHeader?.substring(0, 20),
    });

    if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer '))) {
      const jwtToken = authHeader.replace(/^Bearer /i, '').trim();
      if (jwtToken && jwtToken.length > 0) {
        logger.debug('auth-token', 'Token JWT tradicional encontrado en header', {
          tokenLength: jwtToken.length,
          tokenPrefix: jwtToken.substring(0, 20) + '...',
        });

        // Extraer userId del JWT (sin verificar firma, solo para logging)
        const userId = extractUserIdFromJwt(jwtToken);

        return {
          token: jwtToken,
          type: 'jwt',
          userId: userId || undefined
        };
      } else {
        logger.warn('auth-token', 'Header Authorization encontrado pero token vacío después de procesar');
      }
    } else if (authHeader) {
      logger.warn('auth-token', 'Header Authorization encontrado pero no empieza con Bearer', {
        headerPrefix: authHeader.substring(0, 20),
      });
    }

    // ========================================================================
    // OPCIÓN 2: Token de Auth0 (DESHABILITADO TEMPORALMENTE)
    // ========================================================================
    // NOTA: Auth0 está deshabilitado temporalmente debido a incompatibilidad
    // con Next.js 15 (cookies() asíncrono). Si necesitas Auth0, actualiza
    // @auth0/nextjs-auth0 a la versión 4.0.0+ que soporte Next.js 15.
    // Por ahora, solo usamos JWT tradicional del header.
    
    const isAuth0Enabled = Boolean(
      process.env.AUTH0_SECRET &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_ISSUER_BASE_URL
    );

    if (isAuth0Enabled) {
      logger.debug('auth-token', 'Auth0 está configurado pero deshabilitado temporalmente (Next.js 15 compatibility)');
    } else {
      logger.debug('auth-token', 'Auth0 no está configurado, usando solo JWT tradicional');
    }

    /*
    // CÓDIGO DE Auth0 DESHABILITADO TEMPORALMENTE
    // Descomenta cuando @auth0/nextjs-auth0 soporte Next.js 15 completamente
    if (isAuth0Enabled) {
      try {
        // ESTRATEGIA 1: Intentar getAccessToken()
        const tokenResult = await getAccessToken();
        if (tokenResult && tokenResult.accessToken) {
          logger.info('auth-token', '✅ Token Auth0 obtenido exitosamente', {
            tokenLength: tokenResult.accessToken.length
          });

          const userId = extractUserIdFromJwt(tokenResult.accessToken);
          return {
            token: tokenResult.accessToken,
            type: 'auth0',
            userId: userId || undefined
          };
        }
      } catch (accessTokenError: any) {
        logger.debug('auth-token', '⚠️ getAccessToken() falló', {
          error: accessTokenError.message
        });
      }

      // ESTRATEGIA 2: Fallback a getSession()
      try {
        const session = await getSession();
        if (session && session.accessToken) {
          logger.info('auth-token', '✅ Access token Auth0 obtenido desde session', {
            hasSession: true,
            hasAccessToken: true,
            userId: session.user?.sub
          });

          const userId = session.user?.sub || extractUserIdFromJwt(session.accessToken);
          return {
            token: session.accessToken,
            type: 'auth0',
            userId: userId || undefined
          };
        }
      } catch (sessionError: any) {
        logger.debug('auth-token', 'Error al obtener sesión de Auth0', {
          error: sessionError.message
        });
      }
    }
    */

    // ========================================================================
    // Sin token disponible
    // ========================================================================
    logger.debug('auth-token', 'No se encontró ningún token de autenticación');
    return {
      token: null,
      type: null
    };
  } catch (error: any) {
    logger.error('auth-token', 'Error obteniendo token', {
      error: error.message,
      stack: error.stack
    });
    return {
      token: null,
      type: null
    };
  }
}

/**
 * Extrae el userId del token JWT sin verificar la firma.
 *
 * Esto es seguro porque:
 * 1. Solo se usa para logging y contexto
 * 2. La validación real del token la hace el Gateway
 * 3. No se toman decisiones de autorización basadas en esto
 *
 * @param token - JWT token string
 * @returns userId or null
 */
function extractUserIdFromJwt(token: string): string | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      logger.warn('auth-token', 'Token JWT inválido (no tiene 3 partes)');
      return null;
    }

    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());

    // Intentar múltiples claims en orden de prioridad:
    // - userId: JWT del backend
    // - sub: Auth0 (subject claim estándar)
    // - user_id: Alternativa de Auth0
    const userId = payload.userId || payload.sub || payload.user_id || null;

    if (userId) {
      logger.debug('auth-token', 'UserId extraído del JWT', {
        userId: userId,
        source: payload.userId ? 'backend' : 'auth0'
      });
    }

    return userId;
  } catch (error: any) {
    logger.warn('auth-token', 'Error extrayendo userId del JWT', {
      error: error.message
    });
    return null;
  }
}

/**
 * Verifica si Auth0 está completamente configurado.
 *
 * @returns true si todas las variables de Auth0 están configuradas
 */
export function isAuth0Configured(): boolean {
  return Boolean(
    process.env.AUTH0_SECRET &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_ISSUER_BASE_URL &&
    !process.env.AUTH0_ISSUER_BASE_URL.includes('xxxxx') // No placeholder
  );
}

/**
 * Obtiene información del tipo de autenticación activa.
 *
 * Útil para debugging y logging.
 *
 * @returns Object con información de configuración
 */
export function getAuthConfig(): {
  jwtEnabled: boolean;
  auth0Enabled: boolean;
  dualAuth: boolean;
} {
  const auth0Enabled = isAuth0Configured();
  const jwtEnabled = Boolean(process.env.JWT_SECRET);

  return {
    jwtEnabled,
    auth0Enabled,
    dualAuth: jwtEnabled && auth0Enabled
  };
}
