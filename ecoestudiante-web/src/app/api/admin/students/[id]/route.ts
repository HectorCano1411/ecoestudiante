import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // En Next.js 15, params debe ser await
    const params = await context.params;
    const studentId = params.id;

    // Obtener token de autenticación
    const { token, type, userId } = await getAuthToken(request);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    logger.info('route:admin-students-detail', 'income', { 
      studentId, 
      authType: type, 
      userId 
    });

    const response = await backendFetch(`/api/v1/admin/students/${studentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    logger.info('route:admin-students-detail', 'outcome', { success: true, studentId });

    return NextResponse.json(response);
  } catch (error: any) {
    // Await params para obtener el ID en el catch también
    const params = await context.params;
    const studentId = params.id;
    
    const errorMessage = error instanceof Error ? error.message : 'Error al obtener detalle del estudiante';
    const errorStatus = error.status || 500;
    
    logger.error('route:admin-students-detail', 'error', { 
      error: errorMessage, 
      status: errorStatus,
      studentId 
    });
    
    // Si es un 404 del backend, retornar 404 con mensaje claro
    if (errorStatus === 404) {
      return NextResponse.json(
        { error: 'Estudiante no encontrado', message: `No se encontró un estudiante con ID: ${studentId}` },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}
