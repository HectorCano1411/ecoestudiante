/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * POST /api/gam/missions/:missionId/assign
 *
 * Asigna una misión al usuario actual.
 * Soporta autenticación dual (JWT tradicional y Auth0).
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ missionId: string }> }
) {
  try {
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:mission-assign', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para asignar misiones.'
        },
        { status: 401 }
      );
    }

    const { missionId } = await context.params;

    logger.info('route:mission-assign', 'income', {
      authType: type,
      userId,
      missionId
    });

    // Leer body si existe
    let body = null;
    try {
      body = await req.json();
    } catch {
      // Body vacío está bien
      body = null;
    }

    const json = await backendFetch(`/api/v1/gam/missions/${missionId}/assign`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    logger.info('route:mission-assign', 'outcome', {
      success: true,
      missionId,
      authType: type
    });

    return NextResponse.json(json, { status: 201 });
  } catch (error: any) {
    logger.error('route:mission-assign', 'error', {
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
          error: 'Misión ya asignada o inválida',
          message: error.message || 'No se pudo asignar la misión'
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al asignar misión'
      },
      { status: error.status || 500 }
    );
  }
}
