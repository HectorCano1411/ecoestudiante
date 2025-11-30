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
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '50');
    const search = searchParams.get('search') || undefined;
    const career = searchParams.get('career') || undefined;

    logger.info('route:admin-students', 'income', { page, pageSize, search, career, authType: type });

    const params = new URLSearchParams({
      page: page.toString(),
      pageSize: pageSize.toString(),
    });
    if (search) params.append('search', search);
    if (career) params.append('career', career);

    const json = await backendFetch(`/api/v1/admin/students?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:admin-students', 'outcome', { success: true, total: (json as any).total });

    return NextResponse.json(json);
  } catch (error: any) {
    logger.error('route:admin-students', 'error', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Error al obtener estudiantes' },
      { status: error.status || 500 }
    );
  }
}




