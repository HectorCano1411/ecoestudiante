/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAccessToken } from '@auth0/nextjs-auth0';
// getSession is imported but not used in this file

export async function GET(req: NextRequest) {
  try {
    // Intentar obtener token de Auth0 primero (si el usuario está autenticado con Auth0)
    let authHeader: string | null = null;
    
    try {
      const tokenResult = await getAccessToken();
      if (tokenResult?.accessToken) {
        authHeader = `Bearer ${tokenResult.accessToken}`;
        logger.info('route:stats-summary', 'Using Auth0 token');
      }
    } catch (auth0Error: any) {
      // Si falla Auth0, intentar obtener el header Authorization del request (JWT tradicional)
      logger.debug('route:stats-summary', 'Auth0 token not available, trying header', {
        error: auth0Error.message
      });
    }
    
    // Si no hay token de Auth0, buscar en el header Authorization (JWT tradicional)
    if (!authHeader) {
      authHeader = req.headers.get('authorization') || 
                   req.headers.get('Authorization') ||
                   req.headers.get('AUTHORIZATION');
    }
    
    // Log para debugging (sin exponer el token completo)
    logger.info('route:stats-summary', 'income', { 
      hasAuthHeader: !!authHeader,
      authHeaderPrefix: authHeader ? authHeader.substring(0, 20) + '...' : null,
      source: authHeader?.startsWith('Bearer ') ? 'header' : 'none'
    });

    // Si no hay token, retornar error 401
    if (!authHeader) {
      logger.warn('route:stats-summary', 'No authorization token found');
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    // Validar formato del token (debe empezar con "Bearer ")
    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('route:stats-summary', 'Invalid token format', {
        authHeaderPrefix: authHeader.substring(0, 20)
      });
      return NextResponse.json(
        { 
          error: 'Token inválido', 
          message: 'El formato del token de autenticación es inválido' 
        },
        { status: 401 }
      );
    }

    // Preparar headers para el backend
    const headers: HeadersInit = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    // Llamar al backend
    logger.info('route:stats-summary', 'Calling backend', { 
      backendUrl: '/api/v1/stats/summary',
      hasToken: true 
    });

  const json = await backendFetch('/api/v1/stats/summary', {
    method: 'GET',
    headers,
  });

    logger.info('route:stats-summary', 'outcome', { success: true });
  return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-summary', 'error', {
      error: error.message,
      status: error.status,
      stack: error.stack
    });
    
    // Manejar errores del backend
    if (error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: error.message || 'Token de autenticación inválido o expirado. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }
    
    // Otros errores
    const errorMessage = error.message || 'Error al obtener estadísticas';
    const statusCode = error.status || 500;
    
    return NextResponse.json(
      { 
        error: 'INTERNAL_ERROR', 
        message: errorMessage 
      },
      { status: statusCode }
    );
  }
}

