import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

/**
 * API Route para listar instituciones educativas
 * GET /api/institutions
 * 
 * Permite acceso público cuando solo se solicitan instituciones habilitadas (enabled=true)
 * y no hay otros filtros sensibles (search, type).
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');
    const search = searchParams.get('search');
    const typeFilter = searchParams.get('type');

    // Determinar si es una solicitud pública (solo instituciones habilitadas, sin otros filtros)
    const isPublicRequest = enabled === 'true' &&
                           (!search || search.trim() === '') &&
                           !typeFilter;

    // Obtener token de autenticación (opcional para solicitudes públicas)
    const authResult = await getAuthToken(request);
    const token = authResult.token;

    console.log('[route:institutions] Auth result:', {
      hasToken: !!token,
      tokenLength: token?.length,
      authType: authResult.type,
      isPublicRequest,
      enabled,
      search,
      typeFilter,
    });
    
    // Para solicitudes no públicas, requerir autenticación
    if (!isPublicRequest && !token) {
      console.error('[route:institutions] No token found in request for non-public request');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const params = new URLSearchParams();

    if (searchParams.get('page')) params.append('page', searchParams.get('page')!);
    if (searchParams.get('size')) params.append('size', searchParams.get('size')!);
    if (search) params.append('search', search);
    if (typeFilter) params.append('type', typeFilter);
    if (enabled !== null) params.append('enabled', enabled);

    // Construir headers - solo incluir Authorization si hay token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token && token.trim().length > 0) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const data = await backendFetch(`/api/v1/institutions?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:institutions] error', error);
    
    // Intentar extraer el mensaje de error del backend
    let errorMessage = error.message || 'Error al obtener instituciones';
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

/**
 * API Route para crear una institución
 * POST /api/institutions
 */
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

    const data = await backendFetch('/api/v1/institutions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[route:institutions] error', error);
    
    // Intentar extraer el mensaje de error del backend
    let errorMessage = error.message || 'Error al crear institución';
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
