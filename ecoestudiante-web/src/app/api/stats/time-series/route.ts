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
        logger.info('route:stats-time-series', 'Using Auth0 token');
      }
    } catch (auth0Error: any) {
      logger.debug('route:stats-time-series', 'Auth0 token not available, trying header', {
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
      logger.warn('route:stats-time-series', 'No authorization token found');
      return NextResponse.json(
        { 
          error: 'Token requerido o inválido', 
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.' 
        },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      logger.warn('route:stats-time-series', 'Invalid token format');
      return NextResponse.json(
        { 
          error: 'Token inválido', 
          message: 'El formato del token de autenticación es inválido' 
        },
        { status: 401 }
      );
    }

    // Obtener parámetros de query
    const { searchParams } = new URL(req.url);
    const groupBy = searchParams.get('groupBy') || 'month';
    const months = searchParams.get('months');
    const schedule = searchParams.get('schedule');
    const career = searchParams.get('career');
    const month = searchParams.get('month');
    const day = searchParams.get('day');
    const categories = searchParams.getAll('categories');

    const params = new URLSearchParams();
    params.append('groupBy', groupBy);
    if (months) {
      params.append('months', months);
    }
    if (schedule) {
      params.append('schedule', schedule);
    }
    if (career) {
      params.append('career', career);
    }
    if (month) {
      params.append('month', month);
    }
    if (day) {
      params.append('day', day);
    }
    categories.forEach(cat => {
      params.append('categories', cat);
    });

    const headers: HeadersInit = {
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    };

    logger.info('route:stats-time-series', 'Calling backend', { 
      backendUrl: `/api/v1/stats/time-series?${params.toString()}`,
      hasToken: true 
    });
    
    const json = await backendFetch(`/api/v1/stats/time-series?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    logger.info('route:stats-time-series', 'outcome', { success: true, dataPoints: json.data?.length || 0 });
    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:stats-time-series', 'error', {
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
    
    const errorMessage = error.message || 'Error al obtener datos temporales';
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

