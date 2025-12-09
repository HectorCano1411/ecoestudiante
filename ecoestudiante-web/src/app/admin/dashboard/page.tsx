'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import Link from 'next/link';

// Dynamic imports para gráficos (evita SSR issues)
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

export default function AdminDashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar autenticación antes de cargar datos
    const authToken = localStorage.getItem('authToken');
    const userRole = localStorage.getItem('userRole');

    console.log('[Dashboard] Verificando autenticación:', {
      hasToken: !!authToken,
      tokenLength: authToken?.length,
      role: userRole
    });

    if (!authToken) {
      console.error('[Dashboard] No hay token de autenticación, redirigiendo a login...');
      window.location.href = '/admin/login';
      return;
    }

    loadDashboard();
  }, []);

  async function handleLogout() {
    try {
      // Intentar llamar al endpoint de logout si existe
      try {
        await api('/auth/logout', { method: 'POST' });
      } catch (e) {
        // Si no existe el endpoint, continuar con la limpieza local
        console.log('Endpoint de logout no disponible, limpiando sesión localmente');
      }

      // Limpiar todos los datos de autenticación del localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      localStorage.removeItem('userRole');
      localStorage.removeItem('isAdmin');

      // Redirigir al login de administrador
      router.push('/admin/login');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      // Aún así, limpiar localStorage y redirigir
      localStorage.clear();
      router.push('/admin/login');
    }
  }

  async function loadDashboard() {
    try {
      setLoading(true);
      setError(null);
      
      // Verificar que el usuario tenga rol de admin, super admin o profesor antes de hacer la petición
      const userRole = typeof window !== 'undefined' ? localStorage.getItem('userRole') : null;
      if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'PROFESOR') {
        setError('No tienes permisos de administrador. Por favor, inicia sesión con un rol autorizado.');
        setLoading(false);
        return;
      }
      
      // Usar la ruta API de Next.js que hace proxy al backend
      const response = await api<DashboardOverview>('/admin/dashboard');
      setData(response);
      setError(null);
    } catch (e) {
      console.error('Error loading dashboard:', e);
      
      // Manejar errores específicos
      let errorMessage = 'Error al cargar dashboard';
      const error = e as { status?: number; message?: string };
      
      if (error.status === 401 || error.status === 403) {
        errorMessage = 'No tienes permisos para acceder al panel de administración. Por favor, inicia sesión como administrador.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <nav className="flex space-x-4 items-center">
                <Link href="/admin/dashboard" className="text-blue-600 font-medium">Dashboard</Link>
                <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">Usuarios</Link>
                <Link href="/admin/students" className="text-gray-600 hover:text-gray-900">Estudiantes</Link>
                <Link href="/admin/statistics" className="text-gray-600 hover:text-gray-900">Estadísticas</Link>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 ml-4"
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </nav>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    const isPermissionError = error.includes('permisos') || error.includes('No tienes');
    
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                title="Cerrar sesión"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-red-900 mb-2">Error de Acceso</h3>
                <p className="text-red-800 mb-4">{error}</p>
                <div className="flex gap-3">
                  {isPermissionError ? (
                    <Link
                      href="/admin/login"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Ir al Login de Administrador
                    </Link>
                  ) : (
                    <button
                      onClick={loadDashboard}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Reintentar
                    </button>
                  )}
                  <Link
                    href="/"
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Volver al Inicio
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Panel de Administración</h1>
            <nav className="flex space-x-4 items-center">
              <Link href="/admin/dashboard" className="text-blue-600 font-medium">Dashboard</Link>
              <Link href="/admin/users" className="text-gray-600 hover:text-gray-900">Usuarios</Link>
              <Link href="/admin/institutions" className="text-gray-600 hover:text-gray-900">Instituciones</Link>
              <Link href="/admin/students" className="text-gray-600 hover:text-gray-900">Estudiantes</Link>
              <Link href="/admin/statistics" className="text-gray-600 hover:text-gray-900">Estadísticas</Link>
              <div className="flex space-x-2 ml-4">
                {data && (
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('authToken');
                        if (!token) {
                          alert('No estás autenticado. Por favor, inicia sesión.');
                          return;
                        }

                        // Crear URL con token
                        const url = `/api/admin/export/pdf?type=dashboard&token=${encodeURIComponent(token)}`;
                        
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
                )}
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Cerrar sesión"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Cerrar Sesión
                </button>
              </div>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Estudiantes</p>
            <p className="text-3xl font-bold text-gray-900 mt-2">{data.totalStudents.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Estudiantes Activos</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{data.activeStudents.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">Total Cálculos</p>
            <p className="text-3xl font-bold text-blue-600 mt-2">{data.totalCalculations.toLocaleString()}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <p className="text-sm font-medium text-gray-600">CO₂ Ahorrado</p>
            <p className="text-3xl font-bold text-green-600 mt-2">{data.totalKgCO2e.toFixed(2)} kg</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Top Carreras por Cálculos</h2>
            <CategoryBarChart
              data={data.topCareers.slice(0, 10).map((career) => ({
                name: career.career || 'Sin carrera',
                value: career.totalCalculations,
                records: career.studentCount,
              }))}
              title=""
              mode="records"
              height={300}
              showExport={false}
            />
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Métricas Generales</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-700">Tasa de Participación</span>
                <span className="font-semibold">{data.participationRate.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Promedio Cálculos/Estudiante</span>
                <span className="font-semibold">{data.averageCalculationsPerStudent.toFixed(1)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-700">Misiones Completadas</span>
                <span className="font-semibold">{data.totalMissionsCompleted.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Gráfico de tendencias temporales */}
        {data.monthlyStats && data.monthlyStats.data.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-lg font-semibold mb-4">Tendencias de Participación (Últimos 12 meses)</h2>
            <TimeSeriesLineChart
              data={data.monthlyStats.data.map((point) => ({
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
      </div>
    </div>
  );
}




