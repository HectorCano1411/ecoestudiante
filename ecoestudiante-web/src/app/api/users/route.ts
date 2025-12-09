import { NextRequest, NextResponse } from 'next/server';
import { backendFetch as api } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

export async function GET(request: NextRequest) {
  try {
    // Obtener token de autenticación
    const { token } = await getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const params = new URLSearchParams();
    
    searchParams.forEach((value, key) => {
      params.append(key, value);
    });

    const response = await api(`/api/v1/users?${params.toString()}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[server][route:users] error', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener usuarios' },
      { status: error.status || 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener token de autenticación
    const { token } = await getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    const response = await api('/api/v1/users', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(response, { status: 201 });
  } catch (error: any) {
    console.error('[server][route:users] error', error);
    
    // Intentar extraer el mensaje de error del backend
    let errorMessage = error.message || 'Error al crear usuario';
    let errorStatus = error.status || 500;
    
    // Si el error tiene un response, intentar leer el body
    if (error.response) {
      try {
        const errorBody = await error.response.clone().json();
        if (errorBody.error?.message) {
          errorMessage = errorBody.error.message;
        } else if (errorBody.message) {
          errorMessage = errorBody.message;
        } else if (errorBody.error && typeof errorBody.error === 'string') {
          errorMessage = errorBody.error;
        }
        errorStatus = error.response.status || errorStatus;
      } catch {
        // Si no se puede parsear, usar el mensaje por defecto
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}

