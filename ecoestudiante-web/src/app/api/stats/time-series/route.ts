/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/stats/time-series
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
      logger.warn('route:stats-time-series', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido o inválido',
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.'
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

    logger.info('route:stats-time-series', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId,
      groupBy,
      months,
      schedule,
      career,
      categoriesCount: categories.length
    });

    logger.info('route:stats-time-series', 'Calling backend', {
      backendUrl: `/api/v1/calc/stats/time-series?${params.toString()}`,
      authType: type
    });
    
    // ACTUALIZADO: Nueva ruta /api/v1/calc/stats (stats ahora forma parte del bounded context calc)
    const json = await backendFetch(`/api/v1/calc/stats/time-series?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`, // Enviar token al Gateway
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:stats-time-series', 'outcome', {
      success: true,
      authType: type,
      dataPoints: (json as any).data?.length || 0
    });
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

