import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

/**
 * API Route para obtener, actualizar o eliminar un campus
 * GET /api/institutions/campuses/[id]
 * PUT /api/institutions/campuses/[id]
 * DELETE /api/institutions/campuses/[id]
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    // Obtener token de autenticación
    const { token } = await getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const data = await backendFetch(`/api/v1/institutions/campuses/${params.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:campuses-id] error', error);
    
    let errorMessage = error.message || 'Error al obtener campus';
    let errorStatus = error.status || 500;
    
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

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    // Obtener token de autenticación
    const { token } = await getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const data = await backendFetch(`/api/v1/institutions/campuses/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:campuses-id] error', error);
    
    let errorMessage = error.message || 'Error al actualizar campus';
    let errorStatus = error.status || 500;
    
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    // Obtener token de autenticación
    const { token } = await getAuthToken(request);
    
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const data = await backendFetch(`/api/v1/institutions/campuses/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:campuses-id] error', error);
    
    let errorMessage = error.message || 'Error al eliminar campus';
    let errorStatus = error.status || 500;
    
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
