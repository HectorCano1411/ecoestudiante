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
      logger.warn('route:stats-by-category', 'No authorization token found');
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('route:stats-by-category', 'Invalid token format');
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
    
    logger.info('route:stats-by-category', 'Calling backend', { 
      backendUrl,
      hasToken: true,
      categoriesCount: categories.length
    });

    const json = await backendFetch(backendUrl, {
      method: 'GET',
      headers,
    });

    logger.info('route:stats-by-category', 'outcome', { success: true, categories: (json as any).categories?.length || 0 });
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

