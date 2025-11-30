/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * POST /api/gam/missions/check
 *
 * Verifica todas las misiones activas del usuario y completa las que alcanzaron su objetivo.
 * Soporta autenticación dual (JWT tradicional y Auth0).
 */
export async function POST(req: NextRequest) {
  try {
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:missions-check', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para verificar misiones.'
        },
        { status: 401 }
      );
    }

    logger.info('route:missions-check', 'income', {
      authType: type,
      userId
    });

    const json = await backendFetch('/api/v1/gam/missions/check', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:missions-check', 'outcome', {
      success: true,
      completedMissions: (json as any)?.length || 0,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:missions-check', 'error', {
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
        message: error.message || 'Error al verificar misiones'
      },
      { status: error.status || 500 }
    );
  }
}




