import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logger.info('route:auth-register', 'income', { username: body.username, email: body.email });
    
    const json = await backendFetch<{ username: string; email: string; message: string }>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    logger.info('route:auth-register', 'outcome', { username: json.username });
    return NextResponse.json(json);
  } catch (e: any) {
    logger.error('route:auth-register', e);
    return NextResponse.json(
      { error: 'REGISTRATION_ERROR', message: e.message || 'Error en registro' },
      { status: 400 }
    );
  }
}

