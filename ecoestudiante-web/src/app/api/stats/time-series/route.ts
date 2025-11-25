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
      backendUrl: `/api/v1/calc/stats/time-series?${params.toString()}`,
      hasToken: true 
    });
    
    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    const json = await backendFetch(`/api/v1/calc/stats/time-series?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    logger.info('route:stats-time-series', 'outcome', { success: true, dataPoints: (json as any).data?.length || 0 });
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

