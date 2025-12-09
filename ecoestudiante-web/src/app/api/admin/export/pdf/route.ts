import { NextRequest, NextResponse } from 'next/server';
import { backendFetch } from '@/lib/api-server';
import { logger } from '@/lib/logger';
import { getAuthToken } from '@/lib/auth-token';

interface DashboardOverview {
  totalStudents: number;
  activeStudents: number;
  totalCalculations: number;
  totalMissionsCompleted: number;
  totalKgCO2e: number;
  averageCalculationsPerStudent: number;
  participationRate: number;
  topCareers: Array<{
    career: string;
    studentCount: number;
    totalCalculations: number;
    averageCalculations: number;
    totalKgCO2e: number;
  }>;
  monthlyStats: {
    data: Array<{
      date: string;
      count: number;
      totalKgCO2e: number;
    }>;
    period: string;
  };
}

interface CareerStats {
  career: string;
  studentCount: number;
  totalCalculations: number;
  averageCalculations: number;
  totalKgCO2e: number;
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
        logger.info('route:admin-export-pdf', 'Token obtenido de query params');
      }
    }

    if (!authToken) {
      logger.warn('route:admin-export-pdf', 'No se encontró token de autenticación');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Token de autenticación requerido' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') || 'dashboard';
    const year = searchParams.get('year') || new Date().getFullYear().toString();
    const institutionId = searchParams.get('institutionId') || undefined;
    const campusId = searchParams.get('campusId') || undefined;

    logger.info('route:admin-export-pdf', 'income', {
      type: typeParam,
      year,
      institutionId,
      campusId,
      authType: type
    });

    let htmlContent = '';
    let filename = 'reporte.pdf';

    // Obtener nombres de institución y campus para mostrar en el reporte
    let institutionName = '';
    let campusName = '';

    try {
      // Si hay filtros, obtener los nombres
      if (institutionId) {
        try {
          const instResponse = await backendFetch<{id: string, name: string}>(`/api/v1/institutions/${institutionId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          institutionName = instResponse.name;
        } catch (error) {
          logger.warn('route:admin-export-pdf', 'No se pudo obtener nombre de institución', { institutionId });
        }
      }

      if (campusId) {
        try {
          const campusResponse = await backendFetch<{id: string, name: string}>(`/api/v1/institutions/campuses/${campusId}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          });
          campusName = campusResponse.name;
        } catch (error) {
          logger.warn('route:admin-export-pdf', 'No se pudo obtener nombre de campus', { campusId });
        }
      }
    } catch (error) {
      logger.warn('route:admin-export-pdf', 'Error al obtener nombres de filtros', error);
    }

    try {
      if (typeParam === 'dashboard') {
        // Corregir la ruta del endpoint - debe ser /overview
        const data = await backendFetch<DashboardOverview>('/api/v1/admin/dashboard/overview', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
        }).catch((error: any) => {
          logger.error('route:admin-export-pdf', 'Error al obtener datos del dashboard', {
            error: error.message,
            status: error.status
          });
          throw error;
        });

        // Personalizar nombre de archivo según filtros
        let filenameParts = ['dashboard'];
        if (institutionId) filenameParts.push('institucion');
        if (campusId) filenameParts.push('campus');
        filenameParts.push(new Date().toISOString().split('T')[0]);
        filename = `${filenameParts.join('_')}.pdf`;

        htmlContent = generateDashboardHTML(data, institutionName, campusName);
      } else if (typeParam === 'statistics') {
        // Construir query params con filtros
        const params = new URLSearchParams();
        if (year) params.append('year', year);
        if (institutionId) params.append('institutionId', institutionId);
        if (campusId) params.append('campusId', campusId);

        const stats = await backendFetch<CareerStats[]>(
          `/api/v1/admin/statistics/by-career${params.toString() ? '?' + params.toString() : ''}`,
          {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${authToken}`,
              'Content-Type': 'application/json',
            },
          }
        ).catch((error: any) => {
          logger.error('route:admin-export-pdf', 'Error al obtener estadísticas', {
            error: error.message,
            status: error.status
          });
          throw error;
        });

        // Personalizar nombre de archivo según filtros
        let filenameParts = ['estadisticas', year];
        if (institutionId) filenameParts.push('institucion');
        if (campusId) filenameParts.push('campus');
        filename = `${filenameParts.join('_')}.pdf`;

        htmlContent = generateStatisticsHTML(stats, year, institutionName, campusName);
      }
    } catch (fetchError: any) {
      logger.error('route:admin-export-pdf', 'Error al obtener datos del backend', { 
        error: fetchError.message,
        status: fetchError.status 
      });
      
      // Si es un error 401/403, retornar error de autenticación
      if (fetchError.status === 401 || fetchError.status === 403) {
        return NextResponse.json(
          { error: 'Unauthorized', message: 'No tienes permisos para acceder a este recurso' },
          { status: 401 }
        );
      }
      
      throw fetchError;
    }

    // Retornar HTML optimizado para impresión/PDF
    // El navegador puede convertir HTML a PDF usando "Imprimir" -> "Guardar como PDF"
    // Agregar script para auto-imprimir y mejorar la experiencia
    const htmlWithAutoPrint = htmlContent.replace(
      '</body>',
      `
  <script>
    // Auto-imprimir cuando se carga la página (opcional, comentado por defecto)
    // window.onload = function() {
    //   setTimeout(() => window.print(), 500);
    // };
    
    // Mejorar la experiencia de impresión
    window.onbeforeprint = function() {
      document.title = '${filename.replace('.pdf', '')}';
    };
    
    // Manejar errores de impresión
    window.onafterprint = function() {
      // Opcional: cerrar ventana después de imprimir
      // window.close();
    };
  </script>
</body>`
    );
    
    const encodedFilename = encodeURIComponent(filename.replace('.pdf', ''));
    
    return new NextResponse(htmlWithAutoPrint, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Content-Disposition': `inline; filename="${encodedFilename}.html"`,
        // Headers adicionales para mejor compatibilidad
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al exportar PDF';
    const errorStatus = (error as { status?: number })?.status || 500;
    logger.error('route:admin-export-pdf', 'error', { error: errorMessage, status: errorStatus });
    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}

function generateDashboardHTML(data: DashboardOverview, institutionName?: string, campusName?: string): string {
  // Construir título de filtros aplicados
  const filterInfo = [];
  if (institutionName) filterInfo.push(`Institución: ${institutionName}`);
  if (campusName) filterInfo.push(`Campus: ${campusName}`);
  const filterText = filterInfo.length > 0 ? ` - ${filterInfo.join(' - ')}` : '';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte Dashboard - EcoEstudiante${filterText}</title>
  <style>
    @media print {
      @page {
        margin: 1.5cm;
        size: A4;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    * {
      box-sizing: border-box;
    }
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 30px;
      color: #1a1a1a;
      background: white;
      line-height: 1.6;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 4px solid #10b981;
      padding-bottom: 25px;
      margin-bottom: 40px;
    }
    .header-content {
      flex: 1;
    }
    .logo-container {
      width: 120px;
      height: 120px;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 48px;
      color: white;
      font-weight: bold;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header h1 {
      color: #10b981;
      margin: 0 0 10px 0;
      font-size: 32px;
      font-weight: 700;
    }
    .header .subtitle {
      color: #059669;
      margin: 5px 0;
      font-size: 18px;
      font-weight: 600;
    }
    .header p {
      color: #6b7280;
      margin: 5px 0 0 0;
      font-size: 14px;
    }
    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 40px;
    }
    .metric-card {
      background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
      border: 2px solid #e5e7eb;
      border-left: 5px solid #10b981;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      transition: transform 0.2s;
    }
    .metric-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }
    .metric-card h3 {
      margin: 0 0 8px 0;
      font-size: 13px;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .metric-card p {
      margin: 0;
      font-size: 32px;
      font-weight: 700;
      color: #10b981;
      line-height: 1;
    }
    .metric-icon {
      font-size: 20px;
      margin-right: 8px;
    }
    .section {
      margin-bottom: 30px;
      page-break-inside: avoid;
    }
    .section h2 {
      color: #059669;
      border-bottom: 3px solid #10b981;
      padding-bottom: 12px;
      margin-bottom: 20px;
      font-size: 24px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    table {
      width: 100%;
      border-collapse: separate;
      border-spacing: 0;
      margin-top: 20px;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    th {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      padding: 14px 16px;
      text-align: left;
      font-weight: 600;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 14px;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    tr:hover {
      background-color: #f0fdf4;
    }
    .highlight {
      background-color: #d1fae5 !important;
      font-weight: 600;
    }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: #9ca3af;
      font-size: 11px;
      border-top: 2px solid #e5e7eb;
      padding-top: 20px;
    }
    .footer p {
      margin: 5px 0;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #2563eb;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .print-button:hover {
      background: #1d4ed8;
    }
    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">📄 Imprimir / Guardar PDF</button>

  <div class="header">
    <div class="header-content">
      <h1>🌱 EcoEstudiante</h1>
      <p class="subtitle">Reporte del Dashboard Administrativo</p>
      ${filterText ? `<p style="color: #059669; font-weight: 600; margin-top: 8px;">📍 ${filterInfo.join(' • ')}</p>` : ''}
      <p>📅 Generado: ${new Date().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}</p>
    </div>
    <div class="logo-container">
      🌍
    </div>
  </div>

  <div class="metrics">
    <div class="metric-card">
      <h3><span class="metric-icon">👥</span>Total Estudiantes</h3>
      <p>${data.totalStudents.toLocaleString()}</p>
    </div>
    <div class="metric-card">
      <h3><span class="metric-icon">✅</span>Estudiantes Activos</h3>
      <p>${data.activeStudents.toLocaleString()}</p>
    </div>
    <div class="metric-card">
      <h3><span class="metric-icon">📊</span>Total Cálculos</h3>
      <p>${data.totalCalculations.toLocaleString()}</p>
    </div>
    <div class="metric-card">
      <h3><span class="metric-icon">🌿</span>CO₂ Total (kg)</h3>
      <p>${data.totalKgCO2e.toFixed(2)}</p>
    </div>
    <div class="metric-card">
      <h3><span class="metric-icon">📈</span>Tasa de Participación</h3>
      <p>${data.participationRate.toFixed(1)}%</p>
    </div>
    <div class="metric-card">
      <h3><span class="metric-icon">🎯</span>Promedio Cálculos</h3>
      <p>${data.averageCalculationsPerStudent.toFixed(1)}</p>
    </div>
  </div>

  <div class="section">
    <h2>🏆 Top Carreras por Actividad</h2>
    <table>
      <thead>
        <tr>
          <th>Carrera</th>
          <th>Estudiantes</th>
          <th>Cálculos</th>
          <th>Promedio</th>
          <th>CO₂ Total (kg)</th>
        </tr>
      </thead>
      <tbody>
        ${data.topCareers.map((career, index) => `
          <tr ${index === 0 ? 'class="highlight"' : ''}>
            <td><strong>${index + 1}. ${career.career || 'Sin carrera'}</strong></td>
            <td>${career.studentCount.toLocaleString()}</td>
            <td>${career.totalCalculations.toLocaleString()}</td>
            <td>${career.averageCalculations.toFixed(1)}</td>
            <td>${career.totalKgCO2e.toFixed(2)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>

  ${data.monthlyStats && data.monthlyStats.data.length > 0 ? `
  <div class="section">
    <h2>📈 Tendencias Mensuales</h2>
    <table>
      <thead>
        <tr>
          <th>Mes</th>
          <th>Cálculos</th>
          <th>CO₂ Total (kg)</th>
          <th>Tendencia</th>
        </tr>
      </thead>
      <tbody>
        ${data.monthlyStats.data.map((point, index) => {
          const prevCount = index > 0 ? data.monthlyStats.data[index - 1].count : point.count;
          const trend = point.count > prevCount ? '📈 ↑' : point.count < prevCount ? '📉 ↓' : '➡️';
          return `
          <tr>
            <td><strong>${point.date}</strong></td>
            <td>${point.count.toLocaleString()}</td>
            <td>${point.totalKgCO2e.toFixed(2)}</td>
            <td>${trend}</td>
          </tr>
        `;
        }).join('')}
      </tbody>
    </table>
  </div>
  ` : ''}

  <div class="footer">
    <p><strong>🌱 EcoEstudiante</strong> - Panel de Administración</p>
    <p>📧 Contacto: ecoestudiante7@gmail.com</p>
    <p>⚠️ Este reporte contiene información confidencial - Uso interno únicamente</p>
    <p style="margin-top: 10px; font-size: 10px;">© ${new Date().getFullYear()} EcoEstudiante. Todos los derechos reservados.</p>
  </div>

  <script>
    // Mejoras de impresión
    window.onbeforeprint = function() {
      document.title = 'Dashboard_EcoEstudiante_${new Date().toISOString().split('T')[0]}';
    };
  </script>
</body>
</html>
  `;
}

function generateStatisticsHTML(stats: CareerStats[], year: string): string {
  const totalStudents = stats.reduce((sum, s) => sum + s.studentCount, 0);
  const totalCalculations = stats.reduce((sum, s) => sum + s.totalCalculations, 0);
  const totalCO2 = stats.reduce((sum, s) => sum + s.totalKgCO2e, 0);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte Estadísticas - EcoEstudiante</title>
  <style>
    @media print {
      @page {
        margin: 2cm;
      }
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }
    body {
      font-family: Arial, sans-serif;
      max-width: 900px;
      margin: 0 auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 3px solid #10b981;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      color: #10b981;
      margin: 0;
      font-size: 28px;
    }
    .header p {
      color: #666;
      margin: 10px 0 0 0;
    }
    .summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-bottom: 30px;
      background: #f0fdf4;
      padding: 20px;
      border-radius: 8px;
    }
    .summary-item h3 {
      margin: 0 0 5px 0;
      font-size: 14px;
      color: #666;
      font-weight: normal;
    }
    .summary-item p {
      margin: 0;
      font-size: 24px;
      font-weight: bold;
      color: #10b981;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background-color: #10b981;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    td {
      padding: 10px 12px;
      border-bottom: 1px solid #e5e7eb;
    }
    tr:nth-child(even) {
      background-color: #f9fafb;
    }
    .footer {
      margin-top: 40px;
      text-align: center;
      color: #999;
      font-size: 12px;
      border-top: 1px solid #e5e7eb;
      padding-top: 20px;
    }
    .print-button {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #10b981;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .print-button:hover {
      background: #059669;
    }
    @media print {
      .print-button {
        display: none;
      }
    }
  </style>
</head>
<body>
  <button class="print-button" onclick="window.print()">Imprimir / Guardar PDF</button>

  <div class="header">
    <h1>EcoEstudiante - Estadísticas por Carrera</h1>
    <p>Año: ${year} | Generado: ${new Date().toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })}</p>
  </div>

  <div class="summary">
    <div class="summary-item">
      <h3>Total Estudiantes</h3>
      <p>${totalStudents.toLocaleString()}</p>
    </div>
    <div class="summary-item">
      <h3>Total Cálculos</h3>
      <p>${totalCalculations.toLocaleString()}</p>
    </div>
    <div class="summary-item">
      <h3>CO₂ Total (kg)</h3>
      <p>${totalCO2.toFixed(2)}</p>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Carrera</th>
        <th>Estudiantes</th>
        <th>Total Cálculos</th>
        <th>Promedio</th>
        <th>CO₂ Total (kg)</th>
      </tr>
    </thead>
    <tbody>
      ${stats.map(stat => `
        <tr>
          <td><strong>${stat.career || 'Sin carrera'}</strong></td>
          <td>${stat.studentCount}</td>
          <td>${stat.totalCalculations}</td>
          <td>${stat.averageCalculations.toFixed(1)}</td>
          <td>${stat.totalKgCO2e.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="footer">
    <p>Generado por EcoEstudiante - Panel de Administración</p>
    <p>Este reporte contiene información confidencial</p>
  </div>
</body>
</html>
  `;
}
