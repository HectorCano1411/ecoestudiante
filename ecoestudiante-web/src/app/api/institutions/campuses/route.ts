import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { getAuthToken } from '@/lib/auth-token';

/**
 * API Route para listar y crear campus
 * GET /api/institutions/campuses
 * POST /api/institutions/campuses
 * 
 * Permite acceso público cuando se solicitan campus habilitados de una institución específica
 * (enabled=true e institutionId presente), sin otros filtros sensibles.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const enabled = searchParams.get('enabled');
    const institutionId = searchParams.get('institutionId');
    const search = searchParams.get('search');
    
    // Determinar si es una solicitud pública (campus habilitados de una institución específica)
    const isPublicRequest = enabled === 'true' && 
                           institutionId != null && 
                           institutionId.trim() !== '' &&
                           (!search || search.trim() === '');
    
    // Obtener token de autenticación (opcional para solicitudes públicas)
    const authResult = await getAuthToken(request);
    const token = authResult.token;
    
    console.log('[route:campuses] Auth result:', {
      hasToken: !!token,
      tokenLength: token?.length,
      type: authResult.type,
      isPublicRequest,
      enabled,
      institutionId,
      search,
    });
    
    // Para solicitudes no públicas, requerir autenticación
    if (!isPublicRequest && !token) {
      console.error('[route:campuses] No token found in request for non-public request');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const params = new URLSearchParams();
    
    if (searchParams.get('page')) params.append('page', searchParams.get('page')!);
    if (searchParams.get('size')) params.append('size', searchParams.get('size')!);
    if (institutionId) params.append('institutionId', institutionId);
    if (search) params.append('search', search);
    if (enabled !== null) params.append('enabled', enabled);

    // Construir headers - solo incluir Authorization si hay token
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token && token.trim().length > 0) {
      headers['Authorization'] = `Bearer ${token.trim()}`;
    }

    const data = await backendFetch(`/api/v1/institutions/campuses?${params.toString()}`, {
      method: 'GET',
      headers,
    });

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[route:campuses] error', error);
    
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

    const data = await backendFetch('/api/v1/institutions/campuses', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json(data, { status: 201 });
  } catch (error: any) {
    console.error('[route:campuses] error', error);
    
    let errorMessage = error.message || 'Error al crear campus';
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
