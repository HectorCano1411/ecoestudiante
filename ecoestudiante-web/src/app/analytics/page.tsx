'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from 'recharts';
import { api } from '@/lib/api-client';

interface TimeSeriesDataPoint {
  period: string;
  totalKgCO2e: number;
  recordCount: number;
  category?: string;
}

interface TimeSeriesResponse {
  data: TimeSeriesDataPoint[];
  groupBy: string;
  totalKgCO2e: number;
}

interface CategoryStats {
  category: string;
  totalKgCO2e: number;
  recordCount: number;
  percentage: number;
}

interface StatsByCategoryResponse {
  categories: CategoryStats[];
  totalKgCO2e: number;
}

interface StatsSummary {
  totalKgCO2e: number;
  totalRecords: number;
  thisMonthKgCO2e: number;
  lastMonthKgCO2e: number;
  averagePerMonth: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function AnalyticsPage() {
  const router = useRouter();
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [loading, setLoading] = useState(true);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesResponse | null>(null);
  const [categoryData, setCategoryData] = useState<StatsByCategoryResponse | null>(null);
  const [summary, setSummary] = useState<StatsSummary | null>(null);
  const [groupBy, setGroupBy] = useState<'month' | 'day'>('month');
  const [months, setMonths] = useState(12);
  const [loadingData, setLoadingData] = useState(false);
  const [schedule, setSchedule] = useState<string>('');
  const [career, setCareer] = useState<string>('');
  const [month, setMonth] = useState<number | ''>('');
  const [day, setDay] = useState<number | ''>('');
  const [availableCareers, setAvailableCareers] = useState<string[]>([]);
  const [availableCategories, setAvailableCategories] = useState<Record<string, string[]>>({});
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [categoriesKey, setCategoriesKey] = useState(0); // Key para forzar actualización

  // Ref para evitar loops infinitos
  const categoriesLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // Funciones de carga de datos
  const loadAvailableCareers = useCallback(async () => {
    try {
      const careers = await api<string[]>('/stats/available-careers');
      setAvailableCareers(careers || []);
    } catch (error) {
      console.error('Error cargando carreras disponibles:', error);
    }
  }, []);

  const loadAvailableCategories = useCallback(async () => {
    if (categoriesLoadedRef.current) return;
    
    try {
      const categories = await api<Record<string, string[]>>('/stats/available-categories');
      setAvailableCategories(categories || {});
      categoriesLoadedRef.current = true;
      
      // Seleccionar todas las categorías por defecto
      const allCategories = new Set<string>();
      Object.keys(categories || {}).forEach(cat => {
        allCategories.add(cat);
        (categories[cat] || []).forEach(subcat => {
          allCategories.add(`${cat}_${subcat}`);
        });
      });
      setSelectedCategories(allCategories);
    } catch (error) {
      console.error('Error cargando categorías disponibles:', error);
    }
  }, []);

  // Ref para mantener referencia a selectedCategories
  const selectedCategoriesRef = useRef<Set<string>>(new Set());
  
  // Sincronizar ref con state
  useEffect(() => {
    selectedCategoriesRef.current = selectedCategories;
  }, [selectedCategories]);

  const loadTimeSeriesData = useCallback(async () => {
    try {
      setLoadingData(true);
      const params = new URLSearchParams();
      params.append('groupBy', groupBy);
      params.append('months', months.toString());
      if (schedule) params.append('schedule', schedule);
      if (career) params.append('career', career);
      if (month) params.append('month', month.toString());
      if (day) params.append('day', day.toString());
      
      // Agregar categorías seleccionadas desde el ref
      const currentSelected = selectedCategoriesRef.current;
      if (currentSelected.size > 0) {
        Array.from(currentSelected).forEach(cat => {
          params.append('categories', cat);
        });
      }
      
      const data = await api<TimeSeriesResponse>(
        `/stats/time-series?${params.toString()}`
      );
      setTimeSeriesData(data);
    } catch (error) {
      console.error('Error cargando datos temporales:', error);
    } finally {
      setLoadingData(false);
    }
  }, [groupBy, months, schedule, career, month, day]);
  
  // Usar un efecto separado para selectedCategories con debounce
  useEffect(() => {
    if (!loading && categoriesLoadedRef.current && !isInitialLoadRef.current) {
      const timer = setTimeout(() => {
        loadTimeSeriesData();
      }, 300);
      return () => clearTimeout(timer);
    }
    if (categoriesLoadedRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [categoriesKey, loading, loadTimeSeriesData]);

  const loadCategoryData = useCallback(async () => {
    try {
      const data = await api<StatsByCategoryResponse>('/stats/by-category');
      setCategoryData(data);
    } catch (error) {
      console.error('Error cargando datos por categoría:', error);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const data = await api<StatsSummary>('/stats/summary');
      setSummary(data);
    } catch (error) {
      console.error('Error cargando resumen:', error);
    }
  }, []);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadAvailableCareers(),
      loadAvailableCategories(),
      loadTimeSeriesData(),
      loadCategoryData(),
      loadSummary(),
    ]);
  }, [loadAvailableCareers, loadAvailableCategories, loadTimeSeriesData, loadCategoryData, loadSummary]);

  // Efectos
  useEffect(() => {
    if (auth0Loading) return;

    if (!auth0User && !localStorage.getItem('authToken')) {
      router.push('/login');
      return;
    }

    setLoading(false);
    loadAllData();
  }, [router, auth0User, auth0Loading, loadAllData]);

  // Cargar categorías solo una vez
  useEffect(() => {
    if (!loading && !categoriesLoadedRef.current) {
      loadAvailableCareers();
      loadAvailableCategories();
    }
  }, [loading, loadAvailableCareers, loadAvailableCategories]);

  // Cargar datos cuando cambian los filtros (con debounce)
  useEffect(() => {
    if (!loading && categoriesLoadedRef.current && !isInitialLoadRef.current) {
      const timer = setTimeout(() => {
        loadTimeSeriesData();
      }, 300); // Debounce de 300ms para evitar demasiadas llamadas
      return () => clearTimeout(timer);
    }
  }, [groupBy, months, schedule, career, month, day, loading, loadTimeSeriesData]);

  const handleLogout = () => {
    if (auth0User) {
      window.location.href = '/api/auth/logout';
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      router.push('/login');
    }
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(category)) {
        newSelected.delete(category);
      } else {
        newSelected.add(category);
      }
      setCategoriesKey(prev => prev + 1); // Incrementar key para forzar actualización
      return newSelected;
    });
  };

  const toggleCategoryExpansion = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const selectAllCategories = () => {
    const allCategories = new Set<string>();
    Object.keys(availableCategories).forEach(cat => {
      allCategories.add(cat);
      (availableCategories[cat] || []).forEach(subcat => {
        allCategories.add(`${cat}_${subcat}`);
      });
    });
    setSelectedCategories(allCategories);
    setCategoriesKey(prev => prev + 1);
  };

  const deselectAllCategories = () => {
    setSelectedCategories(new Set());
    setCategoriesKey(prev => prev + 1);
  };

  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'electricidad': '⚡',
      'transporte': '🚗',
      'alimentacion': '🍽️',
      'agua': '💧',
      'residuos': '🗑️',
      'otros': '📊',
    };
    return icons[category] || '📋';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'electricidad': 'Electricidad',
      'transporte': 'Transporte',
      'alimentacion': 'Alimentación',
      'agua': 'Agua',
      'residuos': 'Residuos',
      'otros': 'Otros',
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  };

  const getTransportLabel = (subcategory: string): string => {
    const [mode, fuel] = subcategory.split('_');
    const modeLabels: Record<string, string> = {
      'car': 'Auto',
      'bus': 'Bus',
      'metro': 'Metro/Tren',
      'bicycle': 'Bicicleta',
      'walking': 'Caminando',
      'motorcycle': 'Motocicleta',
      'plane': 'Avión',
    };
    const fuelLabels: Record<string, string> = {
      'gasoline': 'Gasolina',
      'diesel': 'Diésel',
      'electric': 'Eléctrico',
      'hybrid': 'Híbrido',
    };
    const modeLabel = modeLabels[mode] || mode;
    const fuelLabel = fuel ? ` (${fuelLabels[fuel] || fuel})` : '';
    return `${modeLabel}${fuelLabel}`;
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando análisis...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
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
                className="px-4 py-2 text-sm bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Historial
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content with Sidebar */}
      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside
          className={`${
            sidebarOpen ? 'w-80' : 'w-0'
          } bg-white border-r border-gray-200 shadow-lg transition-all duration-300 ease-in-out overflow-hidden flex-shrink-0`}
        >
          <div className="h-full flex flex-col">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <span>🌱</span> Filtros de Emisiones
                </h3>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Ocultar sidebar"
                >
                  <span className="text-xl">←</span>
                </button>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
                >
                  ✓ Todas
                </button>
                <button
                  onClick={deselectAllCategories}
                  className="px-3 py-1 text-xs bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                >
                  ✗ Ninguna
                </button>
              </div>
            </div>

            {/* Sidebar Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4">
              {Object.keys(availableCategories).length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-sm">Cargando categorías...</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {Object.entries(availableCategories).map(([category, subcategories]) => (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
                    >
                      {/* Category Header */}
                      <div
                        className="p-3 bg-gray-50 cursor-pointer flex items-center justify-between hover:bg-gray-100 transition-colors"
                        onClick={() => toggleCategoryExpansion(category)}
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedCategories.has(category)}
                            onChange={(e) => {
                              e.stopPropagation();
                              toggleCategory(category);
                            }}
                            className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 transition-all"
                          />
                          <span className="text-lg">{getCategoryIcon(category)}</span>
                          <span className="font-semibold text-gray-800">
                            {getCategoryLabel(category)}
                          </span>
                        </div>
                        {subcategories.length > 0 && (
                          <span
                            className={`text-gray-500 transition-transform duration-200 ${
                              expandedCategories.has(category) ? 'rotate-90' : ''
                            }`}
                          >
                            ▶
                          </span>
                        )}
                      </div>

                      {/* Subcategories */}
                      {subcategories.length > 0 && (
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            expandedCategories.has(category)
                              ? 'max-h-96 opacity-100'
                              : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-2 space-y-1 bg-white">
                            {subcategories.map((subcat) => {
                              const fullKey = `${category}_${subcat}`;
                              return (
                                <label
                                  key={fullKey}
                                  className="flex items-center gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors group"
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedCategories.has(fullKey)}
                                    onChange={() => toggleCategory(fullKey)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 transition-all group-hover:scale-110"
                                  />
                                  <span className="text-sm text-gray-700 flex-1">
                                    {category === 'transporte'
                                      ? getTransportLabel(subcat)
                                      : subcat}
                                  </span>
                                  {selectedCategories.has(fullKey) && (
                                    <span className="text-green-500 text-xs animate-pulse">✓</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-xs text-gray-600 text-center">
                {selectedCategories.size} elemento(s) seleccionado(s)
              </p>
            </div>
          </div>
        </aside>

        {/* Toggle Button when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-green-500 text-white p-2 rounded-r-lg shadow-lg hover:bg-green-600 transition-colors z-10"
            title="Mostrar filtros"
          >
            <span className="text-xl">→</span>
          </button>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            📊 Análisis de Huella de Carbono
          </h2>
          <p className="text-gray-600">
            Visualiza y analiza tus registros de huella de carbono con gráficos dinámicos
          </p>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Total Registros</p>
                  <p className="text-2xl font-bold text-gray-800">{summary.totalRecords}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Huella Total</p>
                  <p className="text-2xl font-bold text-green-600">
                    {summary.totalKgCO2e.toFixed(2)} kg CO₂e
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Este Mes</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {summary.thisMonthKgCO2e.toFixed(2)} kg CO₂e
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transform transition-all hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Promedio Mensual</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {summary.averagePerMonth.toFixed(2)} kg CO₂e
                  </p>
                </div>
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📈</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">🔍 Filtros de Análisis</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agrupar por:
              </label>
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'month' | 'day')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="month">Mes</option>
                <option value="day">Día</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Período (meses):
              </label>
              <select
                value={months}
                onChange={(e) => setMonths(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="3">Últimos 3 meses</option>
                <option value="6">Últimos 6 meses</option>
                <option value="12">Últimos 12 meses</option>
                <option value="24">Últimos 24 meses</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jornada:
              </label>
              <select
                value={schedule}
                onChange={(e) => setSchedule(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                <option value="diurna">Diurna</option>
                <option value="vespertina">Vespertina</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Carrera:
              </label>
              <select
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todas</option>
                {availableCareers.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mes del Año:
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos los meses</option>
                <option value="1">Enero</option>
                <option value="2">Febrero</option>
                <option value="3">Marzo</option>
                <option value="4">Abril</option>
                <option value="5">Mayo</option>
                <option value="6">Junio</option>
                <option value="7">Julio</option>
                <option value="8">Agosto</option>
                <option value="9">Septiembre</option>
                <option value="10">Octubre</option>
                <option value="11">Noviembre</option>
                <option value="12">Diciembre</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Día del Mes:
              </label>
              <select
                value={day}
                onChange={(e) => setDay(e.target.value ? Number(e.target.value) : '')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              >
                <option value="">Todos los días</option>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    Día {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadAllData}
              disabled={loadingData}
              className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingData ? 'Cargando...' : '🔄 Actualizar'}
            </button>
            <button
              onClick={() => {
                setSchedule('');
                setCareer('');
                setMonth('');
                setDay('');
                setMonths(12);
                setGroupBy('month');
              }}
              className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
            >
              🗑️ Limpiar Filtros
            </button>
          </div>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Time Series Line Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📈 Evolución Temporal de Emisiones
            </h3>
            {loadingData ? (
              <div className="h-64 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
              </div>
            ) : timeSeriesData && timeSeriesData.data.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart
                  data={timeSeriesData.data}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorKgCO2e" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="period"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value.toFixed(2)} kg CO₂e`, 'Emisiones']}
                  />
                  <Area
                    type="monotone"
                    dataKey="totalKgCO2e"
                    stroke="#10b981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorKgCO2e)"
                    animationDuration={1000}
                    animationBegin={0}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No hay datos disponibles para el período seleccionado
              </div>
            )}
          </div>

          {/* Category Pie Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              🥧 Distribución por Categoría
            </h3>
            {categoryData && categoryData.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={categoryData.categories as any}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={(props: any) => {
                      const entry = props as CategoryStats;
                      return `${entry.category}: ${entry.percentage.toFixed(1)}%`;
                    }}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="totalKgCO2e"
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {categoryData.categories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`}
                  />
                  <Legend
                    formatter={(value) => value.charAt(0).toUpperCase() + value.slice(1)}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No hay datos por categoría disponibles
              </div>
            )}
          </div>
        </div>

        {/* Bar Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📊 Emisiones por Categoría
            </h3>
            {categoryData && categoryData.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData.categories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="category"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`}
                  />
                  <Bar
                    dataKey="totalKgCO2e"
                    fill="#10b981"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {categoryData.categories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No hay datos disponibles
              </div>
            )}
          </div>

          {/* Records Count Bar Chart */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              📝 Registros por Categoría
            </h3>
            {categoryData && categoryData.categories.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData.categories}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="category"
                    stroke="#6b7280"
                    style={{ fontSize: '12px' }}
                    angle={-45}
                    textAnchor="end"
                    height={80}
                  />
                  <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => `${value} registros`}
                  />
                  <Bar
                    dataKey="recordCount"
                    fill="#3b82f6"
                    radius={[8, 8, 0, 0]}
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {categoryData.categories.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-gray-500">
                No hay datos disponibles
              </div>
            )}
          </div>
        </div>

        {/* Time Series Bar Chart */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            📊 Emisiones por {groupBy === 'month' ? 'Mes' : 'Día'}
          </h3>
          {loadingData ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            </div>
          ) : timeSeriesData && timeSeriesData.data.length > 0 ? (
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={timeSeriesData.data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  stroke="#6b7280"
                  style={{ fontSize: '12px' }}
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#6b7280" style={{ fontSize: '12px' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => `${value.toFixed(2)} kg CO₂e`}
                />
                <Bar
                  dataKey="totalKgCO2e"
                  fill="#10b981"
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                  animationBegin={0}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No hay datos disponibles para el período seleccionado
            </div>
          )}
        </div>
          </div>
        </main>
      </div>
    </div>
  );
}

