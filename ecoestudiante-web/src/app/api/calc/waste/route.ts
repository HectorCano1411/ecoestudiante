/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

/**
 * POST /api/calc/waste
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
    // ========================================================================
    // AUTENTICACIÓN DUAL: Obtener token de Auth0 o JWT tradicional
    // ========================================================================
    const { token, type, userId } = await getAuthToken(req);

    if (!token) {
      logger.warn('route:waste', 'No authorization token found');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Se requiere autenticación para calcular huella de carbono de residuos.'
        },
        { status: 401 }
      );
    }

    const body = await req.json();

    // Validaciones básicas
    if (!body.wasteItems || !Array.isArray(body.wasteItems) || body.wasteItems.length === 0) {
      return NextResponse.json(
        {
          error: 'VALIDATION_ERROR',
          message: 'wasteItems es requerido y debe contener al menos un item'
        },
        { status: 400 }
      );
    }

    // Validar que cada item tenga wasteType y weightKg
    for (const item of body.wasteItems) {
      if (!item.wasteType || typeof item.weightKg !== 'number' || item.weightKg <= 0) {
        return NextResponse.json(
          {
            error: 'VALIDATION_ERROR',
            message: 'Cada wasteItem debe tener wasteType válido y weightKg > 0'
          },
          { status: 400 }
        );
      }
    }

    logger.info('route:waste', 'income', {
      authType: type, // 'jwt' o 'auth0'
      userId,
      itemCount: body.wasteItems.length,
      totalWeight: body.wasteItems.reduce((sum: number, item: any) => sum + item.weightKg, 0),
      disposalMethod: body.disposalMethod,
      country: body.country,
      period: body.period
    });

    // Llamar al backend a través del Gateway
    const json = await backendFetch('/api/v1/calc/waste', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`, // Enviar token al Gateway
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    logger.info('route:waste', 'outcome', {
      calcId: (json as any).calcId,
      kgCO2e: (json as any).kgCO2e,
      authType: type
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:waste', 'error', {
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
          error: 'VALIDATION_ERROR',
          message: error.message || 'Datos de entrada inválidos'
        },
        { status: 400 }
      );
    }

    if (error.status === 422) {
      return NextResponse.json(
        {
          error: 'PROCESSING_ERROR',
          message: error.message || 'No se pudieron procesar los datos (factor de emisión no disponible)'
        },
        { status: 422 }
      );
    }

    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al calcular huella de carbono de residuos'
      },
      { status: error.status || 500 }
    );
  }
}
