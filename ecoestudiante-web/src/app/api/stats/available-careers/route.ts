import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAccessToken } from '@auth0/nextjs-auth0';

export async function GET(req: NextRequest) {
  try {
    // Intentar obtener token de Auth0 primero
    let authHeader: string | null = null;
    
    try {
      const tokenResult = await getAccessToken();
      if (tokenResult?.accessToken) {
        authHeader = `Bearer ${tokenResult.accessToken}`;
        logger.info('route:stats-available-careers', 'Using Auth0 token');
      }
    } catch (auth0Error: any) {
      logger.debug('route:stats-available-careers', 'Auth0 token not available, trying header', {
        error: auth0Error.message
      });
    }
    
    // Si no hay token de Auth0, buscar en el header Authorization (JWT tradicional)
    if (!authHeader) {
      authHeader = req.headers.get('authorization') || 
                   req.headers.get('Authorization') ||
                   req.headers.get('AUTHORIZATION');
    }
    
    if (!authHeader) {
      logger.warn('route:stats-available-careers', 'No authorization token found');
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('route:stats-available-careers', 'Invalid token format');
      return NextResponse.json(
        { 
          error: 'Token inválido', 
          message: 'El formato del token de autenticación es inválido' 
        },
        { status: 401 }
      );
    }

    const headers: HeadersInit = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    logger.info('route:stats-available-careers', 'Calling backend', { 
      backendUrl: '/api/v1/stats/available-careers',
      hasToken: true 
    });
    
    const json = await backendFetch('/api/v1/stats/available-careers', {
      method: 'GET',
      headers,
    });

    logger.info('route:stats-available-careers', 'outcome', { success: true, careersCount: Array.isArray(json) ? json.length : 0 });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-available-careers', 'error', {
      error: error.message,
      status: error.status,
      stack: error.stack
    });
    
    if (error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: error.message || 'Token de autenticación inválido o expirado. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }
    
    const errorMessage = error.message || 'Error al obtener carreras disponibles';
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

