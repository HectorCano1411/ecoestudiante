/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';
import crypto from 'node:crypto';

/**
 * POST /api/calc/electricity
 *
 * AUTENTICACIÓN DUAL: Soporta tanto JWT tradicional como Auth0.
 *
 * El helper getAuthToken() maneja automáticamente:
 * - Token JWT del header Authorization (login tradicional)
 * - Token de Auth0 desde la sesión del servidor
 *
 * Sin romper funcionalidad existente.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const idem = req.headers.get('idempotency-key') ?? `web-${crypto.randomUUID()}`;

    // ========================================================================
    // AUTENTICACIÓN DUAL: Obtener token de Auth0 o JWT tradicional
    // ========================================================================
    const { token, type, userId: tokenUserId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:electricity', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido o inválido',
          message: 'No se encontró el token de autenticación. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
    }

    // Usar userId del token (prioritario) o del body (fallback)
    const userId = tokenUserId || body.userId;

    if (!userId || userId.trim() === '') {
      logger.warn('route:electricity', 'No userId found in token or body');
      return NextResponse.json(
        {
          error: 'Usuario no identificado',
          message: 'No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.'
        },
        { status: 401 }
      );
    }

    // Agregar userId al body
    const requestBody = {
      ...body,
      userId: userId.trim()
    };

    logger.info('route:electricity', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId,
      selectedAppliances: requestBody.selectedAppliances?.length || 0,
      totalKwh: requestBody.kwh,
      idem
    });

    // Llamar al backend a través del Gateway
    // El token será validado por el Gateway (soporta ambos tipos)
    const json = await backendFetch('/api/v1/calc/electricity', {
      method: 'POST',
      headers: {
        'Idempotency-Key': idem,
        'Authorization': `Bearer ${token}` // Enviar token al Gateway
      },
      body: JSON.stringify(requestBody),
    });

    logger.info('route:electricity', 'outcome', {
      success: true,
      calcId: (json as any).calcId,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:electricity', 'error', {
      error: error.message,
      status: error.status,
      stack: error.stack
    });

    if (error.status === 401) {
      return NextResponse.json(
        {
          error: 'Token requerido o inválido',
          message: error.message || 'Token de autenticación inválido o expirado'
        },
        { status: 401 }
      );
    }

    const errorMessage = error.message || 'Error al calcular la huella de carbono';
    const statusCode = error.status || 500;

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: errorMessage },
      { status: statusCode }
    );
  }
}
