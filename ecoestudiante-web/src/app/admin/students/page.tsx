'use client';

import { useEffect, useState, useCallback } from 'react';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface StudentSummary {
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

interface StudentsListResponse {
  students: StudentSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export default function AdminStudentsPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState('');
  const [careerFilter, setCareerFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [xpLevelFilter, setXpLevelFilter] = useState<'all' | 'beginner' | 'intermediate' | 'advanced'>('all');

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
      });
      if (search) params.append('search', search);
      if (careerFilter) params.append('career', careerFilter);

      const response = await api<StudentsListResponse>(`/v1/admin/students?${params.toString()}`);
      setData(response);
    } catch (e) {
      console.error('Error loading students:', e);
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, careerFilter]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    loadStudents();
  };

  const handleResetFilters = () => {
    setSearch('');
    setCareerFilter('');
    setStatusFilter('all');
    setXpLevelFilter('all');
    setPage(1);
  };

  // Aplicar filtros locales (cliente)
  const filteredStudents = data?.students.filter((student) => {
    // Filtro de estado
    if (statusFilter === 'active' && !student.enabled) return false;
    if (statusFilter === 'inactive' && student.enabled) return false;

    // Filtro de nivel XP
    if (xpLevelFilter !== 'all') {
      const xp = student.xpBalance;
      if (xpLevelFilter === 'beginner' && xp >= 500) return false;
      if (xpLevelFilter === 'intermediate' && (xp < 500 || xp >= 2000)) return false;
      if (xpLevelFilter === 'advanced' && xp < 2000) return false;
    }

    return true;
  }) || [];

  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 0;
  const displayTotal = filteredStudents.length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Estudiantes</h1>
            <nav className="flex space-x-4 items-center">
              <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/admin/students" className="text-blue-600 font-medium">Estudiantes</Link>
              <Link href="/admin/statistics" className="text-gray-600 hover:text-gray-900">Estadísticas</Link>
              {data && (
                <a
                  href={`/api/admin/export/csv?type=students${search ? `&search=${encodeURIComponent(search)}` : ''}${careerFilter ? `&career=${encodeURIComponent(careerFilter)}` : ''}`}
                  className="ml-4 px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700"
                  download
                >
                  📥 Exportar CSV
                </a>
              )}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow mb-6 p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            {/* Filtros básicos */}
            <div className="flex gap-4">
              <input
                type="text"
                placeholder="Buscar por nombre o email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={careerFilter}
                onChange={(e) => setCareerFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todas las carreras</option>
                <option value="Ingeniería en Informática">Ingeniería en Informática</option>
                <option value="Ingeniería Civil">Ingeniería Civil</option>
              </select>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Buscar
              </button>
            </div>

            {/* Botón de filtros avanzados */}
            <div className="flex items-center justify-between border-t pt-4">
              <button
                type="button"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
              >
                {showAdvancedFilters ? '▼' : '▶'} Filtros Avanzados
              </button>
              {(statusFilter !== 'all' || xpLevelFilter !== 'all') && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-sm text-gray-600 hover:text-gray-800"
                >
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Filtros avanzados */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los estados</option>
                    <option value="active">Activos</option>
                    <option value="inactive">Inactivos</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Nivel de XP</label>
                  <select
                    value={xpLevelFilter}
                    onChange={(e) => setXpLevelFilter(e.target.value as 'all' | 'beginner' | 'intermediate' | 'advanced')}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los niveles</option>
                    <option value="beginner">Principiante (0-499 XP)</option>
                    <option value="intermediate">Intermedio (500-1999 XP)</option>
                    <option value="advanced">Avanzado (2000+ XP)</option>
                  </select>
                </div>
              </div>
            )}
          </form>

          {/* Indicador de filtros activos */}
          {(statusFilter !== 'all' || xpLevelFilter !== 'all') && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-600">Filtros activos:</span>
              {statusFilter !== 'all' && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                  Estado: {statusFilter === 'active' ? 'Activos' : 'Inactivos'}
                </span>
              )}
              {xpLevelFilter !== 'all' && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-sm rounded-full">
                  XP: {xpLevelFilter === 'beginner' ? 'Principiante' : xpLevelFilter === 'intermediate' ? 'Intermedio' : 'Avanzado'}
                </span>
              )}
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">Cargando estudiantes...</p>
          </div>
        ) : filteredStudents.length > 0 ? (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Carrera</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cálculos</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Misiones</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">XP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {student.username}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.carrera || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          student.enabled
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {student.enabled ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.totalCalculations}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {student.completedMissions}/{student.totalMissions}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="font-medium">{student.xpBalance}</span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({student.xpBalance < 500 ? 'Principiante' : student.xpBalance < 2000 ? 'Intermedio' : 'Avanzado'})
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button
                          onClick={() => router.push(`/admin/students/${student.id}`)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          Ver Detalle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 bg-white rounded-lg shadow p-4">
              <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                {/* Información de registros */}
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-700">
                    Mostrando {displayTotal} estudiante{displayTotal !== 1 ? 's' : ''}
                    {data && displayTotal !== data.total && ` (filtrado de ${data.total} total)`}
                  </p>

                  {/* Selector de tamaño de página */}
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-gray-600">Por página:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setPage(1);
                      }}
                      className="px-3 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>

                {/* Controles de paginación */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    title="Primera página"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Anterior
                  </button>

                  {/* Indicador de página actual */}
                  <div className="flex items-center gap-2 px-4">
                    <span className="text-sm text-gray-600">Página</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={page}
                      onChange={(e) => {
                        const newPage = Number(e.target.value);
                        if (newPage >= 1 && newPage <= totalPages) {
                          setPage(newPage);
                        }
                      }}
                      className="w-16 px-2 py-1 border border-gray-300 rounded text-center text-sm focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-600">de {totalPages}</span>
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    Siguiente
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page >= totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    title="Última página"
                  >
                    »
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <p className="text-gray-600">No se encontraron estudiantes con los filtros aplicados</p>
            {(statusFilter !== 'all' || xpLevelFilter !== 'all') && (
              <button
                onClick={handleResetFilters}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




