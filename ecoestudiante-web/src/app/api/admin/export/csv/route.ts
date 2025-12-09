import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

interface StudentRow {
  id: string;
  username: string;
  email: string;
  carrera: string;
  jornada: string;
  totalCalculations: number;
  completedMissions: number;
  totalMissions: number;
  xpBalance: number;
  lastActivity: string | null;
  enabled: boolean;
}

interface StatsRow {
  career: string;
  studentCount: number;
  totalCalculations: number;
  averageCalculations: number;
  totalKgCO2e: number;
}

// Helper para convertir cualquier objeto a Record
function toRecord(obj: StudentRow | StatsRow): Record<string, unknown> {
  return obj as unknown as Record<string, unknown>;
}

export async function GET(req: NextRequest) {
  try {
    // Obtener token de autenticación
    const { token, type } = await getAuthToken(req);
    
    // Si no hay token en el header, intentar obtenerlo de los query params (para descargas directas)
    let authToken = token;
    if (!authToken) {
      const searchParams = req.nextUrl.searchParams;
      const tokenParam = searchParams.get('token');
      if (tokenParam) {
        authToken = tokenParam;
        logger.info('route:admin-export-csv', 'Token obtenido de query params');
      }
    }

    if (!authToken) {
      logger.warn('route:admin-export-csv', 'No se encontró token de autenticación');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') || 'students';
    const career = searchParams.get('career') || undefined;
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const institutionId = searchParams.get('institutionId') || undefined;
    const campusId = searchParams.get('campusId') || undefined;

    logger.info('route:admin-export-csv', 'income', {
      type: typeParam,
      career,
      year,
      institutionId,
      campusId,
      authType: type,
      hasToken: !!authToken
    });

    type RowData = StudentRow | StatsRow;
    let data: RowData[] = [];
    let filename = 'export.csv';

    if (typeParam === 'students') {
      // Obtener todos los estudiantes con filtros
      interface StudentsResponse {
        students: StudentRow[];
        total: number;
        page: number;
        pageSize: number;
      }

      // Construir query params con filtros
      const params = new URLSearchParams({
        page: '1',
        pageSize: '10000'
      });
      if (career) params.append('career', career);
      if (institutionId) params.append('institutionId', institutionId);
      if (campusId) params.append('campusId', campusId);

      const response = await backendFetch<StudentsResponse>(`/api/v1/admin/students?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      data = response.students || [];

      // Personalizar nombre de archivo según filtros
      let filenameParts = ['estudiantes'];
      if (institutionId) filenameParts.push('institucion');
      if (campusId) filenameParts.push('campus');
      if (career) filenameParts.push(career.toLowerCase().replace(/\s+/g, '_'));
      filename = `${filenameParts.join('_')}_${new Date().toISOString().split('T')[0]}.csv`;

    } else if (typeParam === 'statistics') {
      // Construir query params con filtros
      const params = new URLSearchParams();
      if (career) params.append('career', career);
      if (year) params.append('year', year);
      if (institutionId) params.append('institutionId', institutionId);
      if (campusId) params.append('campusId', campusId);

      const stats = await backendFetch<StatsRow[]>(
        `/api/v1/admin/statistics/by-career${params.toString() ? '?' + params.toString() : ''}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      data = stats || [];

      // Personalizar nombre de archivo según filtros
      let filenameParts = ['estadisticas', year];
      if (institutionId) filenameParts.push('institucion');
      if (campusId) filenameParts.push('campus');
      if (career) filenameParts.push(career.toLowerCase().replace(/\s+/g, '_'));
      filename = `${filenameParts.join('_')}.csv`;
    }

    // Convertir a CSV
    if (data.length === 0) {
      return NextResponse.json({ error: 'No hay datos para exportar' }, { status: 404 });
    }

    // Convertir a Record para acceder a las propiedades dinámicamente
    // Usar conversión a través de unknown para evitar errores de tipos
    const firstRow: Record<string, unknown> = toRecord(data[0]);
    const headers = Object.keys(firstRow);
    
    const csvRows = [
      headers.join(','),
      ...data.map((row) => {
        const rowRecord: Record<string, unknown> = toRecord(row);
        return headers.map((header) => {
          const value = rowRecord[header];
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        }).join(',');
      }),
    ];

    const csvContent = csvRows.join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al exportar CSV';
    const errorStatus = (error as { status?: number })?.status || 500;
    logger.error('route:admin-export-csv', 'error', { error: errorMessage });
    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}








