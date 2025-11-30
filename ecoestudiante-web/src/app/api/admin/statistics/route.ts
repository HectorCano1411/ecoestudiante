/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

export async function GET(req: NextRequest) {
  try {
    const { token, type } = await getAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') || 'by-career';
    const career = searchParams.get('career') || undefined;
    const year = searchParams.get('year') || undefined;

    logger.info('route:admin-statistics', 'income', { type: typeParam, career, year, authType: type });

    let url = '/api/v1/admin/statistics/by-career';
    if (typeParam === 'time-series') {
      url = '/api/v1/admin/statistics/time-series';
    }

    const params = new URLSearchParams();
    if (career) params.append('career', career);
    if (year) params.append('year', year);

    const finalUrl = params.toString() ? `${url}?${params.toString()}` : url;

    const json = await backendFetch(finalUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:admin-statistics', 'outcome', { success: true });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:admin-statistics', 'error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Error al obtener estadísticas' },
      { status: error.status || 500 }
    );
  }
}




