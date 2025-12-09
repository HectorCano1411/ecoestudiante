import { NextRequest, NextResponse } from 'next/server';
import { backendFetch as api } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

export async function GET(
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

    const response = await api(`/api/v1/users/${id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[server][route:users-id] error', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener usuario' },
      { status: error.status || 500 }
    );
  }
}

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

    const body = await request.json();

    const response = await api(`/api/v1/users/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[server][route:users-id] error', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar usuario' },
      { status: error.status || 500 }
    );
  }
}

export async function DELETE(
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

    const response = await api(`/api/v1/users/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[server][route:users-id] error', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar usuario' },
      { status: error.status || 500 }
    );
  }
}

