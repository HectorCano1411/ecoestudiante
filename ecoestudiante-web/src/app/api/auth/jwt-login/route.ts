/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let requestBody: any = null;
  
  try {
    // Leer el body de forma segura con timeout
    const bodyText = await req.text();
    
    if (!bodyText || bodyText.trim().length === 0) {
      logger.error('🔴 [LOGIN] ERROR - Body vacío');
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR', message: 'El cuerpo de la petición está vacío' },
        { status: 400 }
      );
    }
    
    try {
      requestBody = JSON.parse(bodyText);
    } catch (parseError: any) {
      logger.error('🔴 [LOGIN] ERROR - JSON inválido', { 
        error: parseError.message,
        bodyPreview: bodyText.substring(0, 100)
      });
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR', message: 'Formato de datos inválido' },
        { status: 400 }
      );
    }
    
    const username = requestBody?.username || 'N/A';
    
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('🔵 [LOGIN] REQUEST INCOMING');
    logger.info('   Username: {}', username);
    logger.info('   Timestamp: {}', new Date().toISOString());
    logger.info('   IP: {}', req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'N/A');
    logger.info('   User-Agent: {}', req.headers.get('user-agent') || 'N/A');
    logger.info('═══════════════════════════════════════════════════════════════');
    
    logger.info('route:auth-login', 'Calling Gateway', { 
      url: '/api/v1/auth/login',
      username: username,
      hasPassword: !!requestBody?.password
    });
    
    // Validar que username y password estén presentes
    if (!requestBody.username || !requestBody.password) {
      logger.error('🔴 [LOGIN] ERROR - Credenciales faltantes', {
        hasUsername: !!requestBody.username,
        hasPassword: !!requestBody.password
      });
      return NextResponse.json(
        { error: 'AUTHENTICATION_ERROR', message: 'Usuario y contraseña son requeridos' },
        { status: 400 }
      );
    }
    
    const json = await backendFetch('/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: requestBody.username,
        password: requestBody.password,
      }),
    });
    
    const duration = Date.now() - startTime;
    logger.info('🟢 [LOGIN] SUCCESS');
    logger.info('   Username: {}', (json as any).username || username);
    logger.info('   UserId: {}', (json as any).userId || 'N/A');
    logger.info('   Duration: {} ms', duration);
    logger.info('═══════════════════════════════════════════════════════════════');
    logger.info('');
    
    logger.info('route:auth-login', 'outcome', { 
      username: (json as any).username,
      userId: (json as any).userId,
      duration: duration
    });
    
    return NextResponse.json(json);
  } catch (e: any) {
    const duration = Date.now() - startTime;
    logger.error('═══════════════════════════════════════════════════════════════');
    logger.error('🔴 [LOGIN] ERROR');
    logger.error('   Username: {}', requestBody?.username || 'N/A');
    logger.error('   Duration: {} ms', duration);
    logger.error('   Error Type: {}', e.name || 'Unknown');
    logger.error('   Error Message: {}', e.message || 'Unknown error');
    logger.error('   Status Code: {}', e.status || 'N/A');
    
    // Log del stack trace completo para debugging
    if (e.stack) {
      logger.error('   Stack Trace: {}', e.stack);
    }
    
    // Detectar tipos específicos de errores
    if (e.status === 401) {
      logger.error('   ⚠️  UNAUTHORIZED - Credenciales inválidas');
    } else if (e.status === 500) {
      logger.error('   ❌ SERVER ERROR - Problema en el backend');
    } else if (e.message?.includes('ECONNREFUSED') || e.message?.includes('fetch failed')) {
      logger.error('   ❌ CONNECTION ERROR - Gateway o Backend no disponible');
      logger.error('   💡 Verifica que el Gateway esté ejecutándose en puerto 8080');
      logger.error('   💡 Verifica que el Backend esté ejecutándose en puerto 18080');
    } else if (e.message?.includes('ECONNRESET') || e.message?.includes('socket hang up')) {
      logger.error('   ❌ CONNECTION RESET - El servidor cerró la conexión inesperadamente');
    } else if (e.message?.includes('timeout')) {
      logger.error('   ❌ TIMEOUT - La petición tardó demasiado');
    }
    
    logger.error('═══════════════════════════════════════════════════════════════');
    logger.error('');
    
    logger.error('route:auth-login', 'error', {
      error: e.message,
      status: e.status,
      stack: e.stack,
      duration: duration,
      cause: e.cause?.message || e.cause
    });
    
    // Extraer mensaje de error más específico
    let errorMessage = 'Error al iniciar sesión';
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
      { error: 'AUTHENTICATION_ERROR', message: errorMessage },
      { status: statusCode }
    );
  }
}
