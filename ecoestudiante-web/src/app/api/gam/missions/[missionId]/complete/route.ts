/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * POST /api/gam/missions/:missionId/complete
 *
 * Completa una misión manualmente (normalmente se completa automáticamente).
 * Soporta autenticación dual (JWT tradicional y Auth0).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { missionId: string } }
) {
  try {
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:mission-complete', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para completar misiones.'
        },
        { status: 401 }
      );
    }

    const { missionId } = params;

    logger.info('route:mission-complete', 'income', {
      authType: type,
      userId,
      missionId
    });

    const json = await backendFetch(`/api/v1/gam/missions/${missionId}/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:mission-complete', 'outcome', {
      success: true,
      missionId,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:mission-complete', 'error', {
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

    if (error.status === 400) {
      return NextResponse.json(
        {
          error: 'Misión no puede completarse',
          message: error.message || 'La misión no cumple los requisitos para completarse'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al completar misión'
      },
      { status: error.status || 500 }
    );
  }
}
