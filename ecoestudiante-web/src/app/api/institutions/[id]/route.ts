import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

/**
 * API Route para obtener, actualizar o eliminar una institución
 * GET /api/institutions/[id]
 * PUT /api/institutions/[id]
 * DELETE /api/institutions/[id]
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

    const { searchParams } = new URL(request.url);
    const withCampuses = searchParams.get('withCampuses') === 'true';

    const endpoint = withCampuses 
      ? `/api/v1/institutions/${params.id}/with-campuses`
      : `/api/v1/institutions/${params.id}`;

    const data = await backendFetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:institutions-id] error', error);
    
    let errorMessage = error.message || 'Error al obtener institución';
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

    const data = await backendFetch(`/api/v1/institutions/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:institutions-id] error', error);
    
    let errorMessage = error.message || 'Error al actualizar institución';
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

    const data = await backendFetch(`/api/v1/institutions/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:institutions-id] error', error);
    
    let errorMessage = error.message || 'Error al eliminar institución';
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
