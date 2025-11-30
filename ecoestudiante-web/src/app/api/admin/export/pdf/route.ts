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
    const { token, type } = await getAuthToken(req);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = req.nextUrl.searchParams;
    const typeParam = searchParams.get('type') || 'dashboard';
    const year = searchParams.get('year') || new Date().getFullYear().toString();

    logger.info('route:admin-export-pdf', 'income', { type: typeParam, year, authType: type });

    let htmlContent = '';
    let filename = 'reporte.pdf';

    if (typeParam === 'dashboard') {
      const data = await backendFetch<DashboardOverview>('/api/v1/admin/dashboard', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      filename = `dashboard_${new Date().toISOString().split('T')[0]}.pdf`;
      htmlContent = generateDashboardHTML(data);
    } else if (typeParam === 'statistics') {
      const stats = await backendFetch<CareerStats[]>('/api/v1/admin/statistics/by-career', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      filename = `estadisticas_${year}.pdf`;
      htmlContent = generateStatisticsHTML(stats, year);
    }

    // Por ahora retornamos HTML para que el navegador lo imprima
    // En producción, podrías usar una librería como Puppeteer o PDFKit
    // El filename se puede usar en el header Content-Disposition cuando se implemente la generación real de PDF
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        // 'Content-Disposition': `attachment; filename="${filename}"`, // Para cuando se implemente PDF real
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error al exportar PDF';
    const errorStatus = (error as { status?: number })?.status || 500;
    logger.error('route:admin-export-pdf', 'error', { error: errorMessage });
    return NextResponse.json(
      { error: errorMessage },
      { status: errorStatus }
    );
  }
}

function generateDashboardHTML(data: DashboardOverview): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Reporte Dashboard - EcoEstudiante</title>
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
