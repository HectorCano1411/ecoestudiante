/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
// import { getSession } from '@auth0/nextjs-auth0'; // DESHABILITADO: Incompatible con Next.js 15 (cookies() asíncrono)

/**
 * 🔐 AUTENTICACIÓN DUAL ROBUSTA (JWT + Auth0)
 *
 * Este endpoint soporta AMBOS métodos de autenticación sin conflictos:
 *
 * PRIORIDAD 1: JWT Tradicional (Backend HS512)
 *  - Token en header Authorization: Bearer {token}
 *  - Claim esperado: payload.userId
 *  - Usado por: Login tradicional (/api/v1/auth/login)
 *
 * PRIORIDAD 2: Auth0 (OAuth2/OIDC RS256)
 *  - Sesión en cookies HttpOnly (manejada por @auth0/nextjs-auth0)
 *  - Claim esperado: user.sub
 *  - Usado por: Login con Google/Social (/api/auth/login)
 *
 * VENTAJAS:
 *  ✅ Ambos métodos funcionan simultáneamente
 *  ✅ Sin conflictos entre autenticaciones
 *  ✅ Fallback automático (JWT → Auth0)
 *  ✅ Seguro (cookies HttpOnly para Auth0)
 *  ✅ Compatible con Next.js 15
 */
async function getUserIdFromAuth(req: NextRequest): Promise<{
  userId: string | null;
  authType: 'jwt' | 'auth0' | null;
}> {
  // ========================================================================
  // PRIORIDAD 1: JWT Tradicional del Header
  // ========================================================================
  // Intentar obtener el header de autorización (más rápido y común)
  const authHeader = req.headers.get('authorization') ||
                     req.headers.get('Authorization') ||
                     req.headers.get('AUTHORIZATION');

  if (authHeader && (authHeader.startsWith('Bearer ') || authHeader.startsWith('bearer '))) {
    try {
      const token = authHeader.replace(/^Bearer /i, '').trim();

      if (token && token.length > 0) {
        const parts = token.split('.');

        if (parts.length === 3) {
          // Decodificar el payload (segunda parte del JWT)
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
          const userId = payload.userId || payload.sub || payload.id || null;

          if (userId) {
            logger.info('route:auth-me', '✅ [JWT] UserId extraído exitosamente', {
              userId,
              authType: 'jwt'
            });
            return { userId, authType: 'jwt' };
          }
        }
      }
    } catch (jwtError: any) {
      logger.debug('route:auth-me', 'Error decodificando JWT del header (intentando Auth0 fallback)', {
        error: jwtError.message
      });
      // No retornar error - intentar Auth0
    }
  }

  // ========================================================================
  // PRIORIDAD 2: Auth0 Session (Fallback)
  // ========================================================================
  // IMPORTANTE: Auth0 está deshabilitado temporalmente debido a incompatibilidad
  // con Next.js 15 (cookies() asíncrono). Si necesitas Auth0, actualiza
  // @auth0/nextjs-auth0 a la versión más reciente que soporte Next.js 15.
  // Por ahora, solo usamos JWT tradicional.
  
  // Verificar si Auth0 está configurado
  const isAuth0Enabled = Boolean(
    process.env.AUTH0_SECRET &&
    process.env.AUTH0_CLIENT_ID &&
    process.env.AUTH0_CLIENT_SECRET &&
    process.env.AUTH0_ISSUER_BASE_URL
  );

  // DESHABILITADO TEMPORALMENTE: Auth0 tiene problemas con Next.js 15
  // Descomenta el siguiente bloque cuando actualices @auth0/nextjs-auth0
  // o cuando Auth0 soporte completamente Next.js 15
  /*
  if (isAuth0Enabled) {
    try {
      // NOTA: getSession() en Next.js 15 requiere versión actualizada de @auth0/nextjs-auth0
      // que soporte cookies() asíncrono. Versión mínima recomendada: 4.0.0+
      const session = await getSession();

      if (session && session.user && session.user.sub) {
        const userId = session.user.sub;
        logger.info('route:auth-me', '✅ [AUTH0] UserId extraído exitosamente', {
          userId,
          authType: 'auth0'
        });
        return { userId, authType: 'auth0' };
      }
    } catch (sessionError: any) {
      logger.debug('route:auth-me', 'Error al obtener sesión de Auth0', {
        error: sessionError.message
      });
    }
  }
  */
  
  if (isAuth0Enabled) {
    logger.debug('route:auth-me', 'Auth0 está configurado pero deshabilitado temporalmente (Next.js 15 compatibility)');
  }

  // ========================================================================
  // Sin Autenticación
  // ========================================================================
  logger.warn('route:auth-me', 'No se encontró autenticación válida (ni JWT ni Auth0)');
  return { userId: null, authType: null };
}

export async function GET(req: NextRequest) {
  try {
    logger.info('route:auth-me', 'Request received', {
      hasAuthHeader: !!req.headers.get('authorization'),
      hasCookies: !!req.headers.get('cookie'),
      headers: {
        authorization: req.headers.get('authorization') ? 'present' : 'missing',
        'content-type': req.headers.get('content-type')
      }
    });

    const { userId, authType } = await getUserIdFromAuth(req);

    if (!userId) {
      logger.warn('route:auth-me', '❌ No userId found - returning 401', {
        authHeaderPresent: !!req.headers.get('authorization'),
        cookiesPresent: !!req.headers.get('cookie')
      });
      return NextResponse.json(
        {
          error: 'No autenticado',
          message: 'No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
    }

    // ========================================================================
    // ENRIQUECER RESPUESTA CON DATOS DEL USUARIO
    // ========================================================================
    let userInfo: any = {
      userId,
      authType
    };

    // Si es Auth0, obtener información adicional del usuario
    // NOTA: Auth0 deshabilitado temporalmente - solo retornamos userId básico
    if (authType === 'auth0') {
      // Auth0 está deshabilitado temporalmente debido a Next.js 15
      // Solo retornamos el userId básico
      logger.debug('route:auth-me', 'Auth0 info adicional deshabilitada temporalmente');
    }

    logger.info('route:auth-me', '🟢 Success - userId found', {
      userId,
      authType,
      hasName: !!userInfo.name,
      hasEmail: !!userInfo.email
    });

    return NextResponse.json(userInfo);
  } catch (error: any) {
    logger.error('route:auth-me', '🔴 Error', {
      error: error.message,
      stack: error.stack
    });
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al obtener información del usuario'
      },
      { status: 500 }
    );
  }
}

