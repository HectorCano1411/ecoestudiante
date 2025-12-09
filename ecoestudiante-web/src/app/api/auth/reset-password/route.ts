/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/reset-password
 *
 * Restablece la contraseña usando el token recibido por email.
 * NO requiere autenticación (es para usuarios que olvidaron su contraseña).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar que token y password estén presentes
    if (!body.token || typeof body.token !== 'string') {
      logger.warn('route:reset-password', 'Token no proporcionado');
      return NextResponse.json(
        {
          error: 'Token requerido',
          message: 'Debes proporcionar un token válido'
        },
        { status: 400 }
      );
    }
    
    if (!body.password || typeof body.password !== 'string') {
      logger.warn('route:reset-password', 'Password no proporcionado');
      return NextResponse.json(
        {
          error: 'Password requerido',
          message: 'Debes proporcionar una nueva contraseña'
        },
        { status: 400 }
      );
    }
    
    // Validar formato de contraseña (mínimo 8 caracteres)
    if (body.password.length < 8) {
      return NextResponse.json(
        {
          error: 'Password inválido',
          message: 'La contraseña debe tener al menos 8 caracteres'
        },
        { status: 400 }
      );
    }

    logger.info('route:reset-password', 'income', {
      tokenLength: body.token.length,
      hasPassword: !!body.password
    });

    // Llamar al gateway directamente (mismo patrón que forgot-password)
    // Desde el contenedor usa el nombre del servicio Docker
    const gatewayUrl = process.env.GATEWAY_BASE_URL || 'http://gateway:8080';
    const apiUrl = `${gatewayUrl}/api/v1/auth/reset-password`;
    
    logger.info('route:reset-password', 'calling gateway', { url: apiUrl, gatewayUrl });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        token: body.token,
        password: body.password
      }),
    });
    
    if (!response.ok) {
      let errorMessage = `${response.status}: ${response.statusText}`;
      let errorBody: any = null;
      
      try {
        errorBody = await response.clone().json();
        errorMessage = errorBody.message || errorBody.error || errorMessage;
      } catch {
        try {
          const errorText = await response.clone().text();
          errorMessage = errorText || errorMessage;
        } catch {
          // Mantener el mensaje por defecto
        }
      }
      
      logger.error('route:reset-password', 'gateway error', {
        status: response.status,
        error: errorMessage,
        errorBody
      });
      
      // Retornar error del backend directamente
      return NextResponse.json(
        {
          error: response.status === 400 ? 'RESET_PASSWORD_ERROR' : 'INTERNAL_ERROR',
          message: errorMessage
        },
        { status: response.status }
      );
    }
    
    const json = await response.json();

    logger.info('route:reset-password', 'outcome', {
      success: true,
      verified: (json as any).verified,
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:reset-password', 'error', {
      error: error.message,
      status: error.status,
      code: (error as any).code,
      stack: error.stack
    });

    // Manejar error de conexión
    if ((error as any).code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED') || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        {
          error: 'SERVICIO_NO_DISPONIBLE',
          message: 'El servicio de restablecimiento de contraseña no está disponible. Por favor intenta más tarde.'
        },
        { status: 503 }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al procesar el restablecimiento de contraseña'
      },
      { status: error.status || 500 }
    );
  }
}










