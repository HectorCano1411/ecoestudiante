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
    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    logger.info('route:stats-summary', 'Calling backend', { 
      backendUrl: '/api/v1/calc/stats/summary',
      hasToken: true 
    });

    const json = await backendFetch('/api/v1/calc/stats/summary', {
      method: 'GET',
      headers,
    });

    logger.info('route:stats-summary', 'outcome', { success: true });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-summary', 'error', {
      error: error.message,
      status: error.status,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    
    // Manejar errores de conexión (Gateway no disponible)
    if (error.message?.includes('fetch failed') || 
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('Failed to fetch') ||
        error.name === 'TypeError') {
      logger.error('route:stats-summary', 'Connection error - Gateway may be down', {
        error: error.message
      });
      return NextResponse.json(
        { 
          error: 'SERVICE_UNAVAILABLE', 
          message: 'El servicio no está disponible. Por favor, verifica que el Gateway esté ejecutándose en el puerto 8080.' 
        },
        { status: 503 }
      );
    }
    
    // Manejar errores del backend/Gateway
    if (error.status === 401) {
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: error.message || 'Token de autenticación inválido o expirado. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }
    
    if (error.status === 404) {
      return NextResponse.json(
        { 
          error: 'ENDPOINT_NOT_FOUND', 
          message: 'El endpoint de estadísticas no fue encontrado. Verifica la configuración del Gateway.' 
        },
        { status: 404 }
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

