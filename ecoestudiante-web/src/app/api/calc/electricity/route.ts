import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAccessToken, getSession } from '@auth0/nextjs-auth0';
import crypto from 'node:crypto';

/**
 * Extrae el userId del token JWT
 */
function extractUserIdFromToken(token: string): string | null {
  try {
    // Decodificar el token JWT (sin verificar, solo para extraer el userId)
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    return payload.userId || payload.sub || null;
  } catch (error) {
    logger.warn('route:electricity', 'Error extracting userId from token', { error });
    return null;
  }
}

/**
 * Obtiene el userId del usuario autenticado
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
          // Auth0 usa 'sub' como identificador único
          // El backend debería poder manejarlo o necesitamos mapearlo a UUID
          // Por ahora, intentamos usar el sub directamente
          logger.info('route:electricity', 'Using Auth0 sub as userId', { sub: session.user.sub });
          return session.user.sub;
        }
      } catch (sessionError) {
        logger.debug('route:electricity', 'Could not get Auth0 session', { error: sessionError });
      }
    }
  } catch (auth0Error: any) {
    logger.debug('route:electricity', 'Auth0 not available, trying JWT', {
      error: auth0Error.message
    });
  }
  
  // Si no hay Auth0, intentar extraer del header Authorization (JWT tradicional)
  const authHeader = req.headers.get('authorization') || 
                     req.headers.get('Authorization') ||
                     req.headers.get('AUTHORIZATION');
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.replace('Bearer ', '');
    const userId = extractUserIdFromToken(token);
    if (userId) {
      logger.info('route:electricity', 'Extracted userId from JWT token');
      return userId;
    }
  }
  
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idem = req.headers.get('idempotency-key') ?? `web-${crypto.randomUUID()}`;
    
    // Intentar obtener token de Auth0 primero (si el usuario está autenticado con Auth0)
    let authHeader: string | null = null;
    let userId: string | null = body.userId || null;
    
    try {
      const tokenResult = await getAccessToken();
      if (tokenResult?.accessToken) {
        authHeader = `Bearer ${tokenResult.accessToken}`;
        logger.info('route:electricity', 'Using Auth0 token');
      }
    } catch (auth0Error: any) {
      // Si falla Auth0, intentar obtener el header Authorization del request (JWT tradicional)
      logger.debug('route:electricity', 'Auth0 token not available, trying header', {
        error: auth0Error.message
      });
    }
    
    // Si no hay token de Auth0, buscar en el header Authorization (JWT tradicional)
    if (!authHeader) {
      authHeader = req.headers.get('authorization') || 
                   req.headers.get('Authorization') ||
                   req.headers.get('AUTHORIZATION');
    }
    
    const headers: HeadersInit = { 'Idempotency-Key': idem };
    
    if (authHeader) {
      headers['Authorization'] = authHeader;
    } else {
      logger.warn('route:electricity', 'No authorization token found');
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    // Obtener userId del token o sesión si no está en el body
    if (!userId || userId.trim() === '') {
      userId = await getUserIdFromAuth(req);
    }

    // Si no tenemos userId, retornar error
    if (!userId || userId.trim() === '') {
      logger.warn('route:electricity', 'No userId found in token, session, or body');
      return NextResponse.json(
        { 
          error: 'Usuario no identificado', 
          message: 'No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    // Agregar userId al body (el backend lo extraerá del token si es necesario, pero lo incluimos por compatibilidad)
    const requestBody = {
      ...body,
      userId: userId.trim()
    };

    logger.info('route:electricity', 'income', { 
      body: { 
        ...requestBody, 
        selectedAppliances: requestBody.selectedAppliances?.length || 0,
        totalKwh: requestBody.kwh
      },
      idem,
      hasToken: !!authHeader,
      userId,
      applianceCount: requestBody.selectedAppliances?.length || 0
    });

    const json = await backendFetch('/api/v1/calc/electricity', {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    logger.info('route:electricity', 'outcome', { success: true, calcId: json.calcId });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:electricity', 'error', {
      error: error.message,
      status: error.status,
      stack: error.stack
    });
    
    if (error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: error.message || 'Token de autenticación inválido o expirado' 
        },
        { status: 401 }
      );
    }
    
    const errorMessage = error.message || 'Error al calcular la huella de carbono';
    const statusCode = error.status || 500;
    
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMessage },
      { status: statusCode }
    );
  }
}
