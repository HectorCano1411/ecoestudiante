/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/gam/xp-balance
 *
 * Obtiene el balance de XP del usuario actual.
 * Soporta autenticación dual (JWT tradicional y Auth0).
 */
export async function GET(req: NextRequest) {
  try {
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:xp-balance', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para acceder al balance de XP.'
        },
        { status: 401 }
      );
    }

    logger.info('route:xp-balance', 'income', {
      authType: type,
      userId
    });

    const json = await backendFetch('/api/v1/gam/xp-balance', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:xp-balance', 'outcome', {
      success: true,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:xp-balance', 'error', {
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
        message: error.message || 'Error al obtener balance de XP'
      },
      { status: error.status || 500 }
    );
  }
}
