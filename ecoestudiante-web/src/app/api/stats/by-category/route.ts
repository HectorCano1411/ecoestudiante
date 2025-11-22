/* eslint-disable @typescript-eslint/no-explicit-any */
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
        logger.info('route:stats-by-category', 'Using Auth0 token');
      }
    } catch (auth0Error: any) {
      logger.debug('route:stats-by-category', 'Auth0 token not available, trying header', {
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
    let backendUrl = '/api/v1/stats/by-category';
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

    logger.info('route:stats-by-category', 'outcome', { success: true, categories: json.categories?.length || 0 });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-by-category', 'error', {
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

