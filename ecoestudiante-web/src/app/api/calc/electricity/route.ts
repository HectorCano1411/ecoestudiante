import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import crypto from 'node:crypto';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const idem = req.headers.get('idempotency-key') ?? `web-${crypto.randomUUID()}`;

  logger.info('route:electricity', 'income', { body, idem });

  const json = await backendFetch('/api/v1/calc/electricity', {
    method: 'POST',
    headers: { 'Idempotency-Key': idem },
    body: JSON.stringify(body),
  });

  logger.info('route:electricity', 'outcome', json);
  return NextResponse.json(json);
}
