import { NextRequest, NextResponse } from 'next/server';
import { backendFetch as api } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Obtener token de autenticación
    const { token } = await getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const enabled = searchParams.get('enabled') === 'true';

    const response = await api(`/api/v1/users/${id}/toggle-enabled?enabled=${enabled}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[server][route:users-toggle-enabled] error', error);
    return NextResponse.json(
      { error: error.message || 'Error al cambiar estado de usuario' },
      { status: error.status || 500 }
    );
  }
}

