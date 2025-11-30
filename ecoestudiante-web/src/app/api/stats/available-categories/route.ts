/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/stats/available-categories
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
      logger.warn('route:stats-available-categories', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido o inválido',
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
    }

    logger.info('route:stats-available-categories', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId
    });

    logger.info('route:stats-available-categories', '=== INICIO LLAMADA AL BACKEND ===');
    logger.info('route:stats-available-categories', 'Calling backend', {
      backendUrl: '/api/v1/calc/stats/available-categories',
      authType: type
    });

    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    const json = await backendFetch('/api/v1/calc/stats/available-categories', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Enviar token al Gateway
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:stats-available-categories', '=== RESPUESTA DEL BACKEND ===');
    logger.info('route:stats-available-categories', 'Tipo de respuesta:', typeof json);
    logger.info('route:stats-available-categories', 'Es objeto?:', json && typeof json === 'object');
    if (json && typeof json === 'object') {
      const keys = Object.keys(json);
      logger.info('route:stats-available-categories', 'Claves en la respuesta:', keys);
      logger.info('route:stats-available-categories', 'Total categorías:', keys.length);
      for (const key of keys) {
        const value = (json as any)[key];
        logger.info('route:stats-available-categories', `  - ${key}:`, Array.isArray(value) ? `${value.length} subcategorías` : typeof value);
        if (Array.isArray(value) && value.length > 0) {
          logger.info('route:stats-available-categories', `    Subcategorías:`, value.slice(0, 5));
        }
      }
    }
    logger.info('route:stats-available-categories', 'outcome', {
      success: true,
      authType: type
    });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-available-categories', 'error', {
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
    
    const errorMessage = error.message || 'Error al obtener categorías disponibles';
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

