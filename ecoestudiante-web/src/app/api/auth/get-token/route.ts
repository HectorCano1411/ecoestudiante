/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

/**
 * Endpoint para obtener el token de autenticación y devolverlo al cliente.
 * 
 * SOLUCIÓN DEFINITIVA: Eliminamos completamente getAccessToken() de Auth0
 * porque NO es compatible con Next.js 15 (usa cookies() de forma síncrona).
 * 
 * Este endpoint ahora SOLO soporta:
 * 1. JWT tradicional del header Authorization
 * 2. Token de Auth0 desde cookies (si está disponible y puede ser extraído)
 * 
 * Para Auth0, el cliente debe usar useUser() hook directamente en el cliente
 * y pasar el token manualmente si es necesario.
 */
export async function GET(req: NextRequest) {
  try {
    // SOLUCIÓN 1: Verificar si hay token JWT tradicional en el header (más común y rápido)
    const authHeader = req.headers.get('authorization') || 
                       req.headers.get('Authorization') ||
                       req.headers.get('AUTHORIZATION');
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const jwtToken = authHeader.replace(/^Bearer /i, '').trim();
      if (jwtToken) {
        logger.info('route:auth-get-token', 'Token JWT tradicional encontrado en header');
        return NextResponse.json({
          token: jwtToken,
          type: 'jwt',
          source: 'header'
        });
      }
    }
    
    // SOLUCIÓN 2: Intentar leer cookies de Auth0 manualmente (sin usar getAccessToken)
    // Auth0 almacena la sesión en una cookie llamada 'appSession' (o similar)
    try {
      const cookieStore = await cookies();
      const auth0SessionCookie = cookieStore.get('appSession');
      
      if (auth0SessionCookie?.value) {
        // La cookie de Auth0 está encriptada, pero podemos intentar extraer información
        // NOTA: Auth0 encripta la sesión, así que no podemos extraer el token directamente
        // sin desencriptar, lo cual requiere la clave secreta.
        // Por ahora, simplemente indicamos que hay una sesión de Auth0
        logger.info('route:auth-get-token', 'Sesión de Auth0 detectada en cookies, pero no se puede extraer token directamente');
        
        // Retornar un mensaje indicando que el usuario debe usar el hook de Auth0 en el cliente
        return NextResponse.json(
          {
            error: 'AUTH0_SESSION_DETECTED',
            message: 'Sesión de Auth0 detectada. Por favor, usa el hook useUser() de Auth0 en el cliente para obtener el token.',
            hasAuth0Session: true
          },
          { status: 200 } // 200 porque técnicamente hay una sesión, solo que no podemos extraer el token aquí
        );
      }
    } catch (cookieError: any) {
      // Si hay error leyendo cookies, no es crítico
      logger.debug('route:auth-get-token', 'Error leyendo cookies de Auth0', {
        error: cookieError.message
      });
    }
    
    // Si no hay ningún token, retornar error
    logger.warn('route:auth-get-token', 'No se encontró ningún token');
    return NextResponse.json(
      {
        error: 'No autenticado',
        message: 'No se encontró ningún token de autenticación. Por favor, inicia sesión.'
      },
      { status: 401 }
    );
  } catch (error: any) {
    logger.error('route:auth-get-token', 'Error obteniendo token', {
      error: error.message,
      stack: error.stack
    });
    
    return NextResponse.json(
      {
        error: 'INTERNAL_ERROR',
        message: 'Error al obtener el token de autenticación'
      },
      { status: 500 }
    );
  }
}



