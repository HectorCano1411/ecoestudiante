import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAccessToken, getSession } from '@auth0/nextjs-auth0';

/**
 * Obtiene el userId del usuario autenticado
 * Intenta extraerlo del token JWT o de la sesión de Auth0
 */
async function getUserIdFromAuth(req: NextRequest): Promise<string | null> {
  // Intentar obtener token de Auth0 primero
  try {
    const tokenResult = await getAccessToken();
    if (tokenResult?.accessToken) {
      // Para Auth0, obtener el sub de la sesión
      try {
        const session = await getSession();
        if (session?.user?.sub) {
          // Auth0 usa 'sub' como identificador único (formato: "auth0|123456" o "google-oauth2|123456")
          // Intentar obtener el userId del backend usando el token
          try {
            // Llamar al backend para obtener el userId asociado a este sub
            // Por ahora, retornamos el sub directamente y el backend lo manejará
            return session.user.sub;
          } catch (error) {
            logger.warn('route:auth-me', 'Could not get userId from backend, using sub', { error });
            return session.user.sub;
          }
        }
      } catch (sessionError) {
        logger.debug('route:auth-me', 'Could not get Auth0 session', { error: sessionError });
      }
    }
  } catch (auth0Error: any) {
    logger.debug('route:auth-me', 'Auth0 not available', { error: auth0Error.message });
  }
  
  // Si no hay Auth0, intentar extraer del header Authorization (JWT tradicional)
  const authHeader = req.headers.get('authorization') || 
                     req.headers.get('Authorization') ||
                     req.headers.get('AUTHORIZATION');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.replace('Bearer ', '');
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        return payload.userId || payload.sub || null;
      }
    } catch (error) {
      logger.warn('route:auth-me', 'Error extracting userId from JWT', { error });
    }
  }
  
  return null;
}

export async function GET(req: NextRequest) {
  try {
    const userId = await getUserIdFromAuth(req);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'No autenticado', message: 'No se pudo identificar al usuario' },
        { status: 401 }
      );
    }
    
    return NextResponse.json({ userId });
  } catch (error: any) {
    logger.error('route:auth-me', 'error', { error: error.message });
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message || 'Error al obtener información del usuario' },
      { status: 500 }
    );
  }
}

