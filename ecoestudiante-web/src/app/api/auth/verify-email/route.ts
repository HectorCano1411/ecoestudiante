/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    logger.info('route:auth-verify-email', 'income', { token: body.token?.substring(0, 10) + '...' });
    
    const json = await backendFetch('/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    
    logger.info('route:auth-verify-email', 'outcome', { verified: json.verified });
    return NextResponse.json(json);
  } catch (e: any) {
    logger.error('route:auth-verify-email', e);
    return NextResponse.json(
      { error: 'VERIFICATION_ERROR', message: e.message || 'Error al verificar email' },
      { status: 400 }
    );
  }
}

