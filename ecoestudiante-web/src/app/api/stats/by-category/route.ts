/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/stats/by-category
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
      logger.warn('route:stats-by-category', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido o inválido',
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
    }

    // Obtener parámetros de categorías de la query string
    const { searchParams } = new URL(req.url);
    const categories = searchParams.getAll('categories');

    // Construir URL con parámetros de categorías
    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    // El route handler llama al Gateway (puerto 8080), no directamente al backend
    let backendUrl = '/api/v1/calc/stats/by-category';
    if (categories.length > 0) {
      const params = new URLSearchParams();
      categories.forEach(cat => params.append('categories', cat));
      backendUrl += '?' + params.toString();
    }

    logger.info('route:stats-by-category', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId,
      categoriesCount: categories.length
    });

    logger.info('route:stats-by-category', 'Calling backend', {
      backendUrl,
      authType: type
    });

    const json = await backendFetch(backendUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Enviar token al Gateway
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:stats-by-category', 'outcome', {
      success: true,
      authType: type,
      categories: (json as any).categories?.length || 0
    });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-by-category', 'error', {
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
      logger.error('route:stats-by-category', 'Connection error - Gateway may be down', {
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
    
    const errorMessage = error.message || 'Error al obtener estadísticas por categoría';
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

