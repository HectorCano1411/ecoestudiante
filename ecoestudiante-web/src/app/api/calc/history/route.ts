/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * GET /api/calc/history
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
      logger.warn('route:history', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para acceder al historial.'
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const page = searchParams.get('page') || '0';
    const pageSize = searchParams.get('pageSize') || '20';

    const params = new URLSearchParams();
    if (category) params.append('category', category);
    params.append('page', page);
    params.append('pageSize', pageSize);

    logger.info('route:history', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId,
      category,
      page,
      pageSize
    });

    // Llamar al backend a través del Gateway
    const json = await backendFetch(`/api/v1/calc/history?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}` // Enviar token al Gateway
      },
    });

    logger.info('route:history', 'outcome', {
      total: (json as any).total,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:history', 'error', {
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
        message: error.message || 'Error al obtener el historial'
      },
      { status: error.status || 500 }
    );
  }
}

