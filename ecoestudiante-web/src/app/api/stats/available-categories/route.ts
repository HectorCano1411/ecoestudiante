/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

/**
 * SOLUCIÓN DEFINITIVA: Eliminamos completamente la dependencia de Auth0
 * porque @auth0/nextjs-auth0 v3.3.0 NO es compatible con Next.js 15.
 * Este endpoint SOLO soporta autenticación JWT tradicional del header Authorization.
 */
export async function GET(req: NextRequest) {
  try {
    // SOLUCIÓN: Usar SOLO JWT del header Authorization (sin Auth0)
    const authHeader = req.headers.get('authorization') || 
                       req.headers.get('Authorization') ||
                       req.headers.get('AUTHORIZATION');
    
    if (!authHeader) {
      logger.warn('route:stats-available-categories', 'No authorization token found');
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('route:stats-available-categories', 'Invalid token format');
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

    logger.info('route:stats-available-categories', '=== INICIO LLAMADA AL BACKEND ===');
    logger.info('route:stats-available-categories', 'Calling backend', { 
      backendUrl: '/api/v1/calc/stats/available-categories',
      hasToken: true,
      tokenPrefix: authHeader.substring(0, 20) + '...'
    });
    
    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    const json = await backendFetch('/api/v1/calc/stats/available-categories', {
      method: 'GET',
      headers,
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
    logger.info('route:stats-available-categories', 'outcome', { success: true });
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

