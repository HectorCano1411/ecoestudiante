import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');
  const page = searchParams.get('page') || '0';
  const pageSize = searchParams.get('pageSize') || '20';

  const headers: HeadersInit = {};
  if (authHeader) {
    headers['Authorization'] = authHeader;
  }

  const params = new URLSearchParams();
  if (category) params.append('category', category);
  params.append('page', page);
  params.append('pageSize', pageSize);

  logger.info('route:history', 'income', { category, page, pageSize });

  const json = await backendFetch(`/api/v1/calc/history?${params.toString()}`, {
    method: 'GET',
    headers,
  });

  logger.info('route:history', 'outcome', { total: json.total });
  return NextResponse.json(json);
}

