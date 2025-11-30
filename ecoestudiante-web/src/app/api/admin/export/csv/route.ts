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
    const { token, type } = await getAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') || 'students';
    const career = searchParams.get('career') || undefined;

    logger.info('route:admin-export-csv', 'income', { type: typeParam, career, authType: type });

    type RowData = StudentRow | StatsRow;
    let data: RowData[] = [];
    let filename = 'export.csv';

    if (typeParam === 'students') {
      // Obtener todos los estudiantes
      interface StudentsResponse {
        students: StudentRow[];
        total: number;
        page: number;
        pageSize: number;
      }
      const response = await backendFetch<StudentsResponse>('/api/v1/admin/students?page=1&pageSize=10000', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      data = response.students || [];
      filename = 'estudiantes.csv';
    } else if (typeParam === 'statistics') {
      const stats = await backendFetch<StatsRow[]>('/api/v1/admin/statistics/by-career' + (career ? `?career=${career}` : ''), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      data = stats || [];
      filename = 'estadisticas.csv';
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




