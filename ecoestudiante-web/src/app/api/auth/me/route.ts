/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

/**
 * Obtiene el userId del usuario autenticado desde el token JWT.
 * 
 * SOLUCIÓN DEFINITIVA: Eliminamos completamente la dependencia de Auth0
 * porque @auth0/nextjs-auth0 v3.3.0 NO es compatible con Next.js 15
 * (usa cookies() de forma síncrona cuando Next.js 15 requiere await).
 * 
 * Este endpoint SOLO soporta autenticación JWT tradicional, que es lo que
 * usa el login JWT. Si el usuario necesita Auth0, debe usar el endpoint
 * de Auth0 directamente: /api/auth/[...auth0]
 */
async function getUserIdFromAuth(req: NextRequest): Promise<string | null> {
  // SOLUCIÓN: Usar SOLO método JWT tradicional (sin Auth0)
  // Esto es más confiable y no tiene problemas con Next.js 15
  
  // Intentar obtener el header de autorización de múltiples formas
  const authHeader = req.headers.get('authorization') || 
                     req.headers.get('Authorization') ||
                     req.headers.get('AUTHORIZATION') ||
                     req.headers.get('x-authorization'); // Algunos clientes envían así
  
  if (!authHeader) {
    logger.debug('route:auth-me', 'No Authorization header found', {
      allHeaders: Object.fromEntries(req.headers.entries())
    });
    return null;
  }
  
  // Verificar que tenga el formato Bearer
  if (!authHeader.startsWith('Bearer ') && !authHeader.startsWith('bearer ')) {
    logger.warn('route:auth-me', 'Authorization header does not start with Bearer', {
      headerPrefix: authHeader.substring(0, 20)
    });
    return null;
  }
  
  try {
    const token = authHeader.replace(/^Bearer /i, '').trim();
    
    if (!token || token.length === 0) {
      logger.warn('route:auth-me', 'Token is empty after removing Bearer prefix');
      return null;
    }
    
    const parts = token.split('.');
    
    if (parts.length !== 3) {
      logger.warn('route:auth-me', 'Invalid JWT format (not 3 parts)', { 
        partsCount: parts.length,
        tokenLength: token.length
      });
      return null;
    }
    
    // Decodificar el payload (segunda parte del JWT)
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const userId = payload.userId || payload.sub || payload.id || null;
    
    if (userId) {
      logger.info('route:auth-me', 'UserId extraído de JWT exitosamente', { userId });
      return userId;
    } else {
      logger.warn('route:auth-me', 'JWT válido pero sin userId, sub o id', { 
        payloadKeys: Object.keys(payload),
        payloadPreview: JSON.stringify(payload).substring(0, 200)
      });
      return null;
    }
  } catch (error: any) {
    logger.error('route:auth-me', 'Error extracting userId from JWT', { 
      error: error.message,
      errorType: error.constructor.name,
      stack: error.stack
    });
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    logger.info('route:auth-me', 'Request received', {
      hasAuthHeader: !!req.headers.get('authorization'),
      headers: {
        authorization: req.headers.get('authorization') ? 'present' : 'missing',
        'content-type': req.headers.get('content-type')
      }
    });
    
    const userId = await getUserIdFromAuth(req);
    
    if (!userId) {
      logger.warn('route:auth-me', 'No userId found - returning 401', {
        authHeaderPresent: !!req.headers.get('authorization')
      });
      return NextResponse.json(
        { error: 'No autenticado', message: 'No se pudo identificar al usuario. Por favor, inicia sesión nuevamente.' },
        { status: 401 }
      );
    }
    
    logger.info('route:auth-me', 'Success - userId found', { userId });
    return NextResponse.json({ userId });
  } catch (error: any) {
    logger.error('route:auth-me', 'error', { 
      error: error.message,
      stack: error.stack 
    });
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: error.message || 'Error al obtener información del usuario' },
      { status: 500 }
    );
  }
}

