/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

/**
 * POST /api/auth/forgot-password
 *
 * Solicita un reset de contraseña.
 * Envía un email con un enlace para restablecer la contraseña.
 * NO requiere autenticación (es para usuarios que olvidaron su contraseña).
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Validar que el email esté presente
    if (!body.email || typeof body.email !== 'string') {
      logger.warn('route:forgot-password', 'Email no proporcionado');
      return NextResponse.json(
        {
          error: 'Email requerido',
          message: 'Debes proporcionar un correo electrónico'
        },
        { status: 400 }
      );
    }

    logger.info('route:forgot-password', 'income', {
      email: body.email
    });

    // Llamar al gateway (desde el contenedor usa el nombre del servicio Docker)
    // El gateway redirige al backend
    const gatewayUrl = process.env.GATEWAY_BASE_URL || 'http://gateway:8080';
    const apiUrl = `${gatewayUrl}/api/v1/auth/forgot-password`;
    
    logger.info('route:forgot-password', 'calling gateway', { url: apiUrl });
    
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: body.email
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('route:forgot-password', 'gateway error', {
        status: response.status,
        error: errorText
      });
      
      const error = new Error(`Gateway error: ${response.status}`) as any;
      error.status = response.status;
      error.message = errorText;
      throw error;
    }
    
    const json = await response.json();

    logger.info('route:forgot-password', 'outcome', {
      success: true,
      emailSent: (json as any).emailSent,
    });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:forgot-password', 'error', {
      error: error.message,
      status: error.status,
      code: (error as any).code
    });

    // Manejar error de conexión
    if ((error as any).code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
      return NextResponse.json(
        {
          error: 'SERVICIO_NO_DISPONIBLE',
          message: 'El servicio de recuperación de contraseña no está disponible. Por favor intenta más tarde.'
        },
        { status: 503 }
      );
    }

    // Manejar errores del backend
    if (error.status === 400) {
      return NextResponse.json(
        {
          error: 'SOLICITUD_INVALIDA',
          message: error.message || 'Email no válido o no encontrado'
        },
        { status: 400 }
      );
    }

    // Error genérico
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: error.message || 'Error al procesar la solicitud de recuperación de contraseña'
      },
      { status: error.status || 500 }
    );
  }
}
