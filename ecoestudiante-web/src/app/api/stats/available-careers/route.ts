/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/stats/available-careers
 *
 * AUTENTICACIÓN DUAL: Soporta tanto JWT tradicional como Auth0.
 *
 * El helper getAuthToken() maneja automáticamente:
 * - Token JWT del header Authorization (login tradicional)
 * - Token de Auth0 desde la sesión del servidor
 *
 * Sin romper funcionalidad existente.
 */
export async function GET(req: NextRequest) {
  try {
    // ========================================================================
    // AUTENTICACIÓN DUAL: Obtener token de Auth0 o JWT tradicional
    // ========================================================================
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:stats-available-careers', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido o inválido',
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
    }

    logger.info('route:stats-available-careers', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId
    });

    logger.info('route:stats-available-careers', 'Calling backend', {
      backendUrl: '/api/v1/calc/stats/available-careers',
      authType: type
    });

    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    const json = await backendFetch('/api/v1/calc/stats/available-careers', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Enviar token al Gateway
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:stats-available-careers', 'outcome', {
      success: true,
      authType: type,
      careersCount: Array.isArray(json) ? (json as any[]).length : 0
    });
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

