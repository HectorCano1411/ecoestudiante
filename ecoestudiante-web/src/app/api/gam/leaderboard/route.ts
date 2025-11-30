/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/gam/leaderboard
 *
 * Obtiene el leaderboard semanal con top N usuarios.
 * Soporta autenticación dual (JWT tradicional y Auth0).
 */
export async function GET(req: NextRequest) {
  try {
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:leaderboard', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para acceder al leaderboard.'
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const topN = searchParams.get('topN') || '10';

    logger.info('route:leaderboard', 'income', {
      authType: type,
      userId,
      topN
    });

    const json = await backendFetch(`/api/v1/gam/leaderboard?topN=${topN}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:leaderboard', 'outcome', {
      success: true,
      totalUsers: (json as any).totalUsers,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:leaderboard', 'error', {
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
        message: error.message || 'Error al obtener leaderboard'
      },
      { status: error.status || 500 }
    );
  }
}
