/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/gam/missions/my-progress
 *
 * Obtiene el progreso completo del usuario en todas sus misiones.
 * Soporta autenticación dual (JWT tradicional y Auth0).
 */
export async function GET(req: NextRequest) {
  try {
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:missions-progress', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para acceder al progreso de misiones.'
        },
        { status: 401 }
      );
    }

    logger.info('route:missions-progress', 'income', {
      authType: type,
      userId
    });

    const json = await backendFetch('/api/v1/gam/missions/my-progress', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:missions-progress', 'outcome', {
      success: true,
      totalActive: (json as any).totalActive,
      totalCompleted: (json as any).totalCompleted,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:missions-progress', 'error', {
      error: error.message,
      status: error.status
    });

    if (error.status === 401) {
      return NextResponse.json(
        {
          error: 'Token inválido',
          message: error.message || 'Token de autenticación inválido o expirado'
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al obtener progreso de misiones'
      },
      { status: error.status || 500 }
    );
  }
}
