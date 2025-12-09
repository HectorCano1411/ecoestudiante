import { NextRequest, NextResponse } from 'next/server';
import { backendFetch as api } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

export async function POST(
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

    const response = await api(`/api/v1/users/${id}/resend-verification-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[server][route:users-resend-verification] error', error);
    return NextResponse.json(
      { error: error.message || 'Error al reenviar email de verificación' },
      { status: error.status || 500 }
    );
  }
}

