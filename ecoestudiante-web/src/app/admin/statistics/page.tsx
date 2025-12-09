'use client';

import { useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import Link from 'next/link';

// Dynamic imports para gráficos (evita SSR issues)
const CategoryPieChart = dynamic(() => import('@/components/charts/CategoryPieChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow p-4 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600">Cargando gráfico...</div>
    </div>
  ),
});

const TimeSeriesLineChart = dynamic(() => import('@/components/charts/TimeSeriesLineChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow p-4 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600">Cargando gráfico...</div>
    </div>
  ),
});

const CategoryBarChart = dynamic(() => import('@/components/charts/CategoryBarChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow p-4 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600">Cargando gráfico...</div>
    </div>
  ),
});

const PredictiveTrendChart = dynamic(() => import('@/components/charts/PredictiveTrendChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow p-4 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600">Cargando gráfico...</div>
    </div>
  ),
});

interface CareerStats {
  career: string;
  studentCount: number;
  totalCalculations: number;
  averageCalculations: number;
  totalKgCO2e: number;
}

interface TimeSeriesStats {
  data: Array<{
    date: string;
    count: number;
    totalKgCO2e: number;
  }>;
  period: string;
}

interface Institution {
  id: string;
  name: string;
  type: string;
}

interface Campus {
  id: string;
  name: string;
  institutionId: string;
}

export default function AdminStatisticsPage() {
  const [careerStats, setCareerStats] = useState<CareerStats[]>([]);
  const [timeSeries, setTimeSeries] = useState<TimeSeriesStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState<'charts' | 'tables'>('charts');
  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  const [campusFilter, setCampusFilter] = useState<string>('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingCampuses, setLoadingCampuses] = useState(false);

  // Cargar instituciones al montar
  useEffect(() => {
    loadInstitutions();
  }, []);

  // Cargar campus cuando se selecciona una institución
  useEffect(() => {
    if (institutionFilter) {
      loadCampusesForFilter(institutionFilter);
      setCampusFilter(''); // Limpiar campus al cambiar institución
    } else {
      setCampuses([]);
      setCampusFilter('');
    }
  }, [institutionFilter]);

  const loadInstitutions = async () => {
    try {
      setLoadingInstitutions(true);
      const response = await api<{ institutions: Institution[] }>("/institutions?page=0&size=100&enabled=true");
      setInstitutions(response.institutions || []);
    } catch (err: any) {
      console.error("Error al cargar instituciones:", err);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const loadCampusesForFilter = async (institutionId: string) => {
    try {
      setLoadingCampuses(true);
      const response = await api<{ campuses: Campus[] }>(`/institutions/campuses?institutionId=${institutionId}&page=0&size=100&enabled=true`);
      setCampuses(response.campuses || []);
    } catch (err: any) {
      console.error("Error al cargar campus:", err);
      setCampuses([]);
    } finally {
      setLoadingCampuses(false);
    }
  };

  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedYear) params.append('year', selectedYear.toString());
      if (institutionFilter) params.append('institutionId', institutionFilter);
      if (campusFilter) params.append('campusId', campusFilter);

      const [careers, timeSeriesData] = await Promise.all([
        api<CareerStats[]>(`/v1/admin/statistics/by-career?${params.toString()}`),
        api<TimeSeriesStats>(`/v1/admin/statistics/time-series?${params.toString()}`),
      ]);
      setCareerStats(careers);
      setTimeSeries(timeSeriesData);
    } catch (e) {
      console.error('Error loading statistics:', e);
    } finally {
      setLoading(false);
    }
  }, [selectedYear, institutionFilter, campusFilter]);

  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
            <nav className="flex space-x-4 items-center">
              <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/admin/students" className="text-gray-600 hover:text-gray-900">Estudiantes</Link>
              <Link href="/admin/statistics" className="text-blue-600 font-medium">Estadísticas</Link>
              {careerStats.length > 0 && (
                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('authToken');
                        if (!token) {
                          alert('No estás autenticado. Por favor, inicia sesión.');
                          return;
                        }

                        // Crear URL con token y filtros
                        let url = `/api/admin/export/csv?type=statistics&year=${selectedYear}&token=${encodeURIComponent(token)}`;
                        if (institutionFilter) url += `&institutionId=${institutionFilter}`;
                        if (campusFilter) url += `&campusId=${campusFilter}`;
                        
                        // Crear enlace temporal para descargar
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `estadisticas_${selectedYear}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      } catch (error) {
                        console.error('Error al exportar CSV:', error);
                        alert('Error al exportar CSV. Por favor, intenta nuevamente.');
                      }
                    }}
                    className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                  >
                    Exportar CSV
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('authToken');
                        if (!token) {
                          alert('No estás autenticado. Por favor, inicia sesión.');
                          return;
                        }

                        // Crear URL con token y filtros
                        let url = `/api/admin/export/pdf?type=statistics&year=${selectedYear}&token=${encodeURIComponent(token)}`;
                        if (institutionFilter) url += `&institutionId=${institutionFilter}`;
                        if (campusFilter) url += `&campusId=${campusFilter}`;
                        
                        // Abrir en nueva ventana para descargar
                        const newWindow = window.open(url, '_blank');
                        if (!newWindow) {
                          alert('Por favor, permite ventanas emergentes para descargar el PDF');
                        }
                      } catch (error) {
                        console.error('Error al exportar PDF:', error);
                        alert('Error al exportar PDF. Por favor, intenta nuevamente.');
                      }
                    }}
                    className="px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Exportar PDF
                  </button>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros y controles */}
        <div className="mb-6 bg-white rounded-lg shadow p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Año</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {[2023, 2024, 2025].map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institución</label>
              <select
                value={institutionFilter}
                onChange={(e) => {
                  setInstitutionFilter(e.target.value);
                  setCampusFilter('');
                }}
                disabled={loadingInstitutions}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Todas las instituciones</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campus/Sede</label>
              <select
                value={campusFilter}
                onChange={(e) => setCampusFilter(e.target.value)}
                disabled={loadingCampuses || !institutionFilter}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">
                  {!institutionFilter 
                    ? "Primero selecciona una institución"
                    : loadingCampuses 
                    ? "Cargando..." 
                    : "Todos los campus"}
                </option>
                {campuses.map((campus) => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={() => {
                  setInstitutionFilter('');
                  setCampusFilter('');
                  setSelectedYear(new Date().getFullYear());
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Limpiar Filtros
              </button>
            </div>
          </div>

          {/* Botones de vista */}
          <div className="flex space-x-2 mt-4">
            <button
              onClick={() => setViewMode('charts')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'charts'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Gráficos
            </button>
            <button
              onClick={() => setViewMode('tables')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'tables'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            >
              Tablas
            </button>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Cargando estadísticas...</p>
          </div>
        ) : (
          <>
            {viewMode === 'charts' ? (
              <div className="space-y-6">
                {/* Gráficos de carreras */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Gráfico de pastel - Distribución de CO₂ por Carrera */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Distribución de CO₂ por Carrera</h2>
                    <CategoryPieChart
                      data={careerStats.slice(0, 8).map((stat) => ({
                        name: stat.career || 'Sin carrera',
                        value: stat.totalKgCO2e,
                        records: stat.totalCalculations,
                      }))}
                      title=""
                      height={400}
                      showExport={true}
                    />
                  </div>

                  {/* Gráfico de barras - Top Carreras por Cálculos */}
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Top Carreras por Cálculos</h2>
                    <CategoryBarChart
                      data={careerStats.slice(0, 10).map((stat) => ({
                        name: stat.career || 'Sin carrera',
                        value: stat.totalCalculations,
                        records: stat.studentCount,
                      }))}
                      title=""
                      mode="records"
                      height={400}
                      showExport={true}
                    />
                  </div>
                </div>

                {/* Gráfico de tendencias temporales */}
                {timeSeries && timeSeries.data.length > 0 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Tendencias de Actividad - {selectedYear}</h2>
                    <TimeSeriesLineChart
                      data={timeSeries.data.map((point) => ({
                        period: point.date,
                        emissions: point.totalKgCO2e,
                        records: point.count,
                      }))}
                      title=""
                      height={400}
                      showExport={true}
                    />
                  </div>
                )}

                {/* Gráfico de tendencias predictivas */}
                {timeSeries && timeSeries.data.length >= 3 && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-lg font-semibold mb-4">Proyección y Tendencias Futuras</h2>
                    <PredictiveTrendChart
                      data={timeSeries.data.map((point) => ({
                        period: point.date,
                        value: point.count,
                      }))}
                      title=""
                      height={450}
                      showExport={true}
                      predictMonths={3}
                    />
                    <p className="text-sm text-gray-600 mt-4">
                      Este gráfico utiliza regresión lineal para proyectar las tendencias de actividad para los próximos 3 meses.
                      La banda azul clara representa el intervalo de confianza de la predicción.
                    </p>
                  </div>
                )}

                {/* Resumen de métricas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Total de Carreras</p>
                    <p className="text-3xl font-bold text-blue-600 mt-2">{careerStats.length}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Total Estudiantes</p>
                    <p className="text-3xl font-bold text-green-600 mt-2">
                      {careerStats.reduce((sum, stat) => sum + stat.studentCount, 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <p className="text-sm font-medium text-gray-600">Total Cálculos</p>
                    <p className="text-3xl font-bold text-purple-600 mt-2">
                      {careerStats.reduce((sum, stat) => sum + stat.totalCalculations, 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Vista de tablas (original) */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-xl font-semibold mb-4">Estadísticas por Carrera</h2>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carrera</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estudiantes</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Cálculos</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Promedio</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂ Total (kg)</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {careerStats.map((stat, idx) => (
                          <tr key={idx}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{stat.career || 'Sin carrera'}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.studentCount}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.totalCalculations}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.averageCalculations.toFixed(1)}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">{stat.totalKgCO2e.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {timeSeries && (
                  <div className="bg-white rounded-lg shadow p-6">
                    <h2 className="text-xl font-semibold mb-4">Tendencias Temporales</h2>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Mes</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cálculos</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂ Total (kg)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {timeSeries.data.map((point, idx) => (
                            <tr key={idx}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">{point.date}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{point.count}</td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">{point.totalKgCO2e.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}








