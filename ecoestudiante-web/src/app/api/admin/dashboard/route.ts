import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

export async function GET(req: NextRequest) {
  try {
    const { token, type, userId } = await getAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    logger.info('route:admin-dashboard', 'income', { authType: type, userId });

    const json = await backendFetch('/api/v1/admin/dashboard/overview', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:admin-dashboard', 'outcome', { success: true });

    return NextResponse.json(json);
  } catch (error) {
    const errorObj = error as { message?: string; status?: number };
    const errorMessage = errorObj.message || 'Error al obtener dashboard';
    const errorStatus = errorObj.status || 500;
    
    logger.error('route:admin-dashboard', 'error', { error: errorMessage });
    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}




