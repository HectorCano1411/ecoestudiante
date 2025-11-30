/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { getSession } from '@auth0/nextjs-auth0';

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
  // Intentar obtener sesión de Auth0 desde cookies
  // IMPORTANTE: getSession() requiere el Request object
  try {
    // Verificar si Auth0 está configurado
    const isAuth0Enabled = Boolean(
      process.env.AUTH0_SECRET &&
      process.env.AUTH0_CLIENT_ID &&
      process.env.AUTH0_CLIENT_SECRET &&
      process.env.AUTH0_ISSUER_BASE_URL
    );

    if (isAuth0Enabled) {
      // getSession() de @auth0/nextjs-auth0 requiere Request + Response
      // En Next.js 15 App Router, necesitamos llamarlo sin parámetros
      // (usa cookies internamente)
      const session = await getSession();

      if (session && session.user && session.user.sub) {
        // Auth0 usa 'sub' como identificador único del usuario
        const userId = session.user.sub;

        logger.info('route:auth-me', '✅ [AUTH0] UserId extraído exitosamente', {
          userId,
          authType: 'auth0',
          email: session.user.email,
          name: session.user.name
        });

        return { userId, authType: 'auth0' };
      } else {
        logger.debug('route:auth-me', 'getSession() retornó sesión vacía o sin user.sub', {
          hasSession: !!session,
          hasUser: !!(session && session.user),
          sessionKeys: session ? Object.keys(session) : []
        });
      }
    } else {
      logger.debug('route:auth-me', 'Auth0 no está configurado - saltando verificación Auth0');
    }
  } catch (auth0Error: any) {
    logger.debug('route:auth-me', 'Error al obtener sesión de Auth0', {
      error: auth0Error.message,
      errorName: auth0Error.name,
      stack: auth0Error.stack ? auth0Error.stack.substring(0, 200) : undefined
    });
    // No es un error crítico - simplemente no hay sesión de Auth0
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
    if (authType === 'auth0') {
      try {
        const session = await getSession();
        if (session && session.user) {
          userInfo = {
            userId,
            authType,
            name: session.user.name || null,
            email: session.user.email || null,
            picture: session.user.picture || null,
            nickname: session.user.nickname || null
          };
        }
      } catch (error: any) {
        logger.warn('route:auth-me', 'No se pudo obtener info adicional de Auth0', {
          error: error.message
        });
      }
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

