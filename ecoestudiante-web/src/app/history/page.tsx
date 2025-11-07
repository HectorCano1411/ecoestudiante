'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { CalcHistoryResponse, CalcHistoryItem } from '@/types/calc';

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CalcHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    
    loadHistory();
  }, [category, page]);

  const loadHistory = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      const data = await api<CalcHistoryResponse>(`/calc/history?${params.toString()}`);
      setHistory(data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getCategoryIcon = (cat: string) => {
    const icons: Record<string, string> = {
      electricidad: '⚡',
      transporte: '🚗',
      alimentacion: '🍽️',
      agua: '💧',
      residuos: '🗑️',
    };
    return icons[cat] || '📊';
  };

  const totalPages = history ? Math.ceil(history.total / pageSize) : 0;

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">E</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">EcoEstudiante</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('username');
                  localStorage.removeItem('userId');
                  router.push('/login');
                }}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <span>←</span> Volver al dashboard
          </button>
        </div>

        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Historial de Registros</h2>
          <p className="text-gray-600">
            Revisa todos tus registros de huella de carbono
          </p>
        </div>

        {/* Filtros */}
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Filtrar por categoría
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                }}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <option value="">Todas las categorías</option>
                <option value="electricidad">⚡ Electricidad</option>
                <option value="transporte">🚗 Transporte</option>
                <option value="alimentacion">🍽️ Alimentación</option>
                <option value="agua">💧 Agua</option>
                <option value="residuos">🗑️ Residuos</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contenido */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando historial...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <p className="text-red-800">{error}</p>
          </div>
        ) : !history || history.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay registros</h3>
            <p className="text-gray-600 mb-6">
              Aún no has registrado ninguna huella de carbono
            </p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Registrar Primera Huella
            </button>
          </div>
        ) : (
          <>
            {/* Resumen */}
            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold">{history.items.length}</span> de{' '}
                <span className="font-semibold">{history.total}</span> registros
              </p>
            </div>

            {/* Tabla de registros */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Categoría
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Detalles
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Huella
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {history.items.map((item: CalcHistoryItem) => (
                      <tr key={item.calcId} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{getCategoryIcon(item.category)}</span>
                            <span className="text-sm font-medium text-gray-800 capitalize">
                              {item.category}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600">
                            {item.category === 'electricidad' && (
                              <>
                                <div><strong>Consumo:</strong> {item.input.kwh} kWh</div>
                                <div><strong>País:</strong> {item.input.country}</div>
                                <div><strong>Período:</strong> {item.input.period}</div>
                              </>
                            )}
                            {item.category !== 'electricidad' && (
                              <div className="text-xs text-gray-500">
                                Ver detalles próximamente
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-lg font-bold text-green-600">
                            {item.kgCO2e.toFixed(2)} kg CO₂e
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(item.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Página {page + 1} de {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPage(Math.max(0, page - 1))}
                        disabled={page === 0}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                        disabled={page >= totalPages - 1}
                        className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

