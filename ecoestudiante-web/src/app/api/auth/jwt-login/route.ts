import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logger.info('route:auth-login', 'income', { username: body.username });
    
    const json = await backendFetch('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    logger.info('route:auth-login', 'outcome', { username: (json as any).username });
    return NextResponse.json(json);
  } catch (e: any) {
    logger.error('route:auth-login', e);
    
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
