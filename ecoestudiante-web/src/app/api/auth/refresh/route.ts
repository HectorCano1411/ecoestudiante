/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

/**
 * API Route para refrescar el access token usando un refresh token válido.
 * POST /api/auth/refresh
 *
 * Body: { refreshToken: string }
 * Response: { accessToken, refreshToken, userId, username, ... }
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let requestBody: any = null;

  try {
    // Leer el body de forma segura
    const bodyText = await req.text();

    if (!bodyText || bodyText.trim().length === 0) {
      logger.error('[REFRESH] ERROR - Body vacío');
      return NextResponse.json(
        { error: 'REFRESH_TOKEN_ERROR', message: 'El cuerpo de la petición está vacío' },
        { status: 400 }
      );
    }

    try {
      requestBody = JSON.parse(bodyText);
    } catch (parseError: any) {
      logger.error('[REFRESH] ERROR - JSON inválido', {
        error: parseError.message,
        bodyPreview: bodyText.substring(0, 100)
      });
      return NextResponse.json(
        { error: 'REFRESH_TOKEN_ERROR', message: 'Formato de datos inválido' },
        { status: 400 }
      );
    }

    logger.info('[REFRESH] REQUEST INCOMING', {
      timestamp: new Date().toISOString(),
      hasRefreshToken: !!requestBody?.refreshToken,
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'N/A'
    });

    // Validar que refreshToken esté presente
    if (!requestBody.refreshToken) {
      logger.error('[REFRESH] ERROR - Refresh token faltante');
      return NextResponse.json(
        { error: 'REFRESH_TOKEN_ERROR', message: 'Refresh token es requerido' },
        { status: 400 }
      );
    }

    // Llamar al backend para refrescar el token
    const json = await backendFetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken: requestBody.refreshToken,
      }),
    });

    const duration = Date.now() - startTime;
    logger.info('[REFRESH] SUCCESS', {
      username: (json as any).username || 'N/A',
      userId: (json as any).userId || 'N/A',
      duration: duration
    });

    return NextResponse.json(json);
  } catch (e: any) {
    const duration = Date.now() - startTime;
    logger.error('[REFRESH] ERROR', {
      duration: duration,
      errorType: e.name || 'Unknown',
      errorMessage: e.message || 'Unknown error',
      statusCode: e.status || 'N/A'
    });

    // Log del stack trace para debugging
    if (e.stack) {
      logger.debug('[REFRESH] Stack trace:', e.stack);
    }

    // Detectar tipos específicos de errores
    if (e.status === 401) {
      logger.warn('[REFRESH] UNAUTHORIZED - Refresh token inválido o expirado');
    } else if (e.status === 500) {
      logger.error('[REFRESH] SERVER ERROR - Problema en el backend');
    } else if (e.message?.includes('ECONNREFUSED') || e.message?.includes('fetch failed')) {
      logger.error('[REFRESH] CONNECTION ERROR - Gateway o Backend no disponible');
    }

    // Extraer mensaje de error más específico
    let errorMessage = 'Error al refrescar el token';
    let statusCode = 401;

    if (e.message) {
      // Extraer el mensaje después de "BACKEND XXX: "
      const match = e.message.match(/BACKEND \d+: (.+)/);
      if (match && match[1]) {
        errorMessage = match[1];
      } else {
        errorMessage = e.message.replace('BACKEND ', '').replace(/^\d+: /, '');
      }
    }

    // Intentar obtener el mensaje del body de la respuesta si existe
    if (e.response) {
      try {
        const errorBody = await e.response.clone().json().catch(() => null);
        if (errorBody?.message) {
          errorMessage = errorBody.message;
        }
        if (errorBody?.error) {
          statusCode = e.status || 401;
        }
      } catch {
        // Ignorar errores al parsear
      }
    }

    return NextResponse.json(
      { error: 'REFRESH_TOKEN_ERROR', message: errorMessage },
      { status: statusCode }
    );
  }
}
