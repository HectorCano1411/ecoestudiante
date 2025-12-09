/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api-client';
import SummaryCards from '@/components/analytics/SummaryCards';
import FiltersPanel from '@/components/analytics/FiltersPanel';
import CategorySidebar from '@/components/analytics/CategorySidebar';

// ECharts components - Dynamic imports to avoid SSR issues
const TimeSeriesLineChart = dynamic(() => import('@/components/charts/TimeSeriesLineChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600 font-medium">Cargando gráfico...</div>
    </div>
  ),
});

const CategoryPieChart = dynamic(() => import('@/components/charts/CategoryPieChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600 font-medium">Cargando gráfico...</div>
    </div>
  ),
});

const CategoryBarChart = dynamic(() => import('@/components/charts/CategoryBarChart'), {
  ssr: false,
  loading: () => (
    <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 h-96 flex items-center justify-center">
      <div className="animate-pulse text-gray-600 font-medium">Cargando gráfico...</div>
    </div>
  ),
});

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

// ============================================================================
// 🎭 MOCK DATA MODE - TEMPORARY FOR TESTING ECHARTS
// ============================================================================
const USE_MOCK_DATA = false; // Using real API data

// Interfaz para datos raw del historial
interface CalcHistoryItem {
  calcId: string;
  category: string;
  subcategory: string | null;
  input: any;
  kgCO2e: number;
  createdAt: string;
}

interface CalcHistoryResponse {
  items: CalcHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}

// ============================================================================
// 🎭 MOCK DATA GENERATORS
// ============================================================================

function generateMockSummary(): StatsSummary {
  return {
    totalKgCO2e: 856.42,
    totalRecords: 127,
    thisMonthKgCO2e: 78.34,
    lastMonthKgCO2e: 65.21,
    averagePerMonth: 71.37,
  };
}

function generateMockCategoryData(): StatsByCategoryResponse {
  return {
    categories: [
      { category: 'transporte', totalKgCO2e: 387.65, recordCount: 52, percentage: 45.3 },
      { category: 'electricidad', totalKgCO2e: 298.43, recordCount: 48, percentage: 34.8 },
      { category: 'residuos', totalKgCO2e: 170.34, recordCount: 27, percentage: 19.9 },
    ],
    totalKgCO2e: 856.42,
  };
}

function generateMockTimeSeriesData(groupBy: 'month' | 'day', months: number): TimeSeriesResponse {
  const data: TimeSeriesDataPoint[] = [];
  const now = new Date();

  if (groupBy === 'month') {
    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const baseEmission = 60 + Math.random() * 40;
      const seasonalVariation = Math.sin((date.getMonth() / 12) * Math.PI * 2) * 15;

      data.push({
        period,
        totalKgCO2e: baseEmission + seasonalVariation,
        recordCount: Math.floor(8 + Math.random() * 8),
      });
    }
  } else {
    // Last 30 days
    for (let i = 29; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const period = date.toISOString().split('T')[0];
      const baseEmission = 2 + Math.random() * 4;

      data.push({
        period,
        totalKgCO2e: baseEmission,
        recordCount: Math.floor(Math.random() * 5),
      });
    }
  }

  const totalKgCO2e = data.reduce((sum, d) => sum + d.totalKgCO2e, 0);
  return { data, groupBy, totalKgCO2e };
}

function generateMockAvailableCategories(): Record<string, string[]> {
  return {
    transporte: ['car_gasoline', 'car_electric', 'bus', 'metro', 'bicycle', 'walking'],
    electricidad: ['laptop', 'desktop', 'monitor', 'lampara', 'ventilador', 'router'],
    residuos: ['organic_composting', 'plastic_recycling', 'paper_recycling', 'glass_recycling'],
  };
}

function generateMockRawHistoryData(): CalcHistoryItem[] {
  const items: CalcHistoryItem[] = [];
  const categories = ['transporte', 'electricidad', 'residuos'];
  const now = new Date();

  // Generate 100 mock records over the past 6 months
  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(Math.random() * 180);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);

    const category = categories[Math.floor(Math.random() * categories.length)];
    let input: any = {};
    let kgCO2e = 0;
    let subcategory = null;

    if (category === 'transporte') {
      const modes = ['car_gasoline', 'car_electric', 'bus', 'metro', 'bicycle'];
      const mode = modes[Math.floor(Math.random() * modes.length)];
      const [transportMode, fuelType] = mode.split('_');
      input = {
        transportMode,
        fuelType: fuelType || null,
        distance: 5 + Math.random() * 20,
      };
      kgCO2e = mode.includes('car_gasoline') ? 2 + Math.random() * 5 : 0.5 + Math.random() * 2;
      subcategory = mode;
    } else if (category === 'electricidad') {
      const appliances = ['laptop', 'desktop', 'monitor', 'lampara', 'ventilador'];
      const selected = [appliances[Math.floor(Math.random() * appliances.length)]];
      input = {
        selectedAppliances: selected,
        hoursPerDay: 4 + Math.random() * 8,
      };
      kgCO2e = 1 + Math.random() * 4;
      subcategory = selected[0];
    } else if (category === 'residuos') {
      const wasteTypes = ['organic', 'plastic', 'paper', 'glass'];
      const wasteType = wasteTypes[Math.floor(Math.random() * wasteTypes.length)];
      const methods = ['composting', 'recycling', 'landfill'];
      const disposalMethod = methods[Math.floor(Math.random() * methods.length)];
      input = {
        wasteItems: [{ wasteType, kg: 1 + Math.random() * 5 }],
        disposalMethod,
      };
      kgCO2e = 0.5 + Math.random() * 3;
      subcategory = `${wasteType}_${disposalMethod}`;
    }

    items.push({
      calcId: `mock-${i}`,
      category,
      subcategory,
      input,
      kgCO2e,
      createdAt: date.toISOString(),
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

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

  // NUEVO: Estado para almacenar datos raw del historial para filtrado granular
  const [rawHistoryData, setRawHistoryData] = useState<CalcHistoryItem[]>([]);

  // Helper para obtener estadísticas de una categoría
  const getCategoryStats = useCallback(
    (categoryKey: string): { totalKgCO2e: number; recordCount: number } => {
      if (!categoryData) return { totalKgCO2e: 0, recordCount: 0 };
      
      // Si es una subcategoría (formato: "categoria_subcategoria")
      if (categoryKey.includes('_')) {
        // Desestructurar para separar categoría y subcategoría (no se usan actualmente)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const [_category, _subcategory] = categoryKey.split('_');
        // Buscar en los datos disponibles (esto requeriría datos más detallados del backend)
        // Por ahora, retornamos 0 para subcategorías individuales
        return { totalKgCO2e: 0, recordCount: 0 };
      }
      
      // Si es una categoría principal
      const stats = categoryData.categories.find((cat) => cat.category === categoryKey);
      return stats
        ? { totalKgCO2e: stats.totalKgCO2e, recordCount: stats.recordCount }
        : { totalKgCO2e: 0, recordCount: 0 };
    },
    [categoryData],
  );

  // Ref para evitar loops infinitos
  const categoriesLoadedRef = useRef(false);
  const isInitialLoadRef = useRef(true);

  // ===========================================================================
  // NUEVA FUNCIÓN: Cargar datos RAW del historial para filtrado granular
  // ===========================================================================

  /**
   * Carga TODOS los datos del historial (sin paginación) para permitir
   * filtrado granular por subcategorías en el frontend
   */
  const loadRawHistoryData = useCallback(async () => {
    console.log('📚 [loadRawHistoryData] === INICIO ===');
    try {
      if (USE_MOCK_DATA) {
        // 🎭 MOCK DATA
        console.log('📚 [loadRawHistoryData] Usando MOCK DATA...');
        const items = generateMockRawHistoryData();
        setRawHistoryData(items);
        console.log('📚 [loadRawHistoryData] Mock data loaded:', items.length, 'items');
        return;
      }

      // Cargar todos los datos con un pageSize grande
      // NOTA: En producción, esto debería hacerse con carga incremental
      const params = new URLSearchParams();
      params.append('pageSize', '10000'); // Cargar hasta 10k registros
      params.append('page', '0');

      const url = `/calc/history?${params.toString()}`;
      console.log('📚 [loadRawHistoryData] Llamando API:', url);

      const data = await api<CalcHistoryResponse>(url);
      console.log('📚 [loadRawHistoryData] === RESPUESTA ===');
      console.log('📚 [loadRawHistoryData] Total items:', data?.items?.length || 0);

      if (data && data.items) {
        setRawHistoryData(data.items);
        console.log('📚 [loadRawHistoryData] Datos raw almacenados');
      } else {
        setRawHistoryData([]);
      }
    } catch (error: any) {
      console.error('🔴 [loadRawHistoryData] Error:', error?.message);
      setRawHistoryData([]);
    }
    console.log('📚 [loadRawHistoryData] === FIN ===');
  }, []);

  // Funciones de carga de datos
  const loadAvailableCareers = useCallback(async () => {
    try {
      if (USE_MOCK_DATA) {
        // 🎭 MOCK DATA
        setAvailableCareers(['Ingeniería de Sistemas', 'Ingeniería Ambiental', 'Administración', 'Economía']);
        return;
      }
      const careers = await api<string[]>('/stats/available-careers');
      setAvailableCareers(careers || []);
    } catch (error) {
      console.error('Error cargando carreras disponibles:', error);
    }
  }, []);

  const loadAvailableCategories = useCallback(async (forceReload = false) => {
    console.log('🔵 [loadAvailableCategories] === INICIO ===', { forceReload, alreadyLoaded: categoriesLoadedRef.current });

    if (categoriesLoadedRef.current && !forceReload) {
      console.log('🔵 [loadAvailableCategories] Ya cargado, saltando...');
      return;
    }

    try {
      if (USE_MOCK_DATA) {
        // 🎭 MOCK DATA
        console.log('🔵 [loadAvailableCategories] Usando MOCK DATA...');
        const categories = generateMockAvailableCategories();
        console.log('🔵 [loadAvailableCategories] Mock categories:', categories);

        setAvailableCategories(categories);
        categoriesLoadedRef.current = true;

        // Select all categories by default
        const allCategories = new Set<string>();
        const allExpanded = new Set<string>();

        Object.keys(categories).forEach(cat => {
          if (cat) {
            allCategories.add(cat);
            allExpanded.add(cat);
            const subcats = categories[cat];
            if (Array.isArray(subcats) && subcats.length > 0) {
              subcats.forEach((subcat) => {
                if (subcat) {
                  allCategories.add(`${cat}_${subcat}`);
                }
              });
            }
          }
        });

        setSelectedCategories(allCategories);
        setExpandedCategories(allExpanded);
        console.log('🔵 [loadAvailableCategories] Mock data loaded successfully');
        return;
      }

      console.log('🔵 [loadAvailableCategories] Llamando API /stats/available-categories...');
      const categories = await api<Record<string, string[]>>('/stats/available-categories');
      console.log('🔵 [loadAvailableCategories] === RESPUESTA DE API ===');
      console.log('🔵 [loadAvailableCategories] Tipo de respuesta:', typeof categories);
      console.log('🔵 [loadAvailableCategories] Es null?:', categories === null);
      console.log('🔵 [loadAvailableCategories] Es undefined?:', categories === undefined);
      console.log('🔵 [loadAvailableCategories] Respuesta completa:', categories);
      
      // Asegurarse de que categories sea un objeto válido
      const validCategories = categories && typeof categories === 'object' ? categories : {};
      console.log('🔵 [loadAvailableCategories] === VALIDACIÓN ===');
      console.log('🔵 [loadAvailableCategories] Categorías válidas:', validCategories);
      console.log('🔵 [loadAvailableCategories] Claves de categorías:', Object.keys(validCategories));
      console.log('🔵 [loadAvailableCategories] Total categorías:', Object.keys(validCategories).length);
      
      setAvailableCategories(validCategories);
      categoriesLoadedRef.current = true;
      console.log('🔵 [loadAvailableCategories] Estado actualizado: availableCategories y categoriesLoadedRef');
      
      // Seleccionar todas las categorías por defecto
      const allCategories = new Set<string>();
      const allExpanded = new Set<string>();
      console.log('🔵 [loadAvailableCategories] === PROCESANDO CATEGORÍAS ===');
      
      Object.keys(validCategories).forEach(cat => {
        if (cat) {
          console.log(`🔵 [loadAvailableCategories] Procesando categoría: ${cat}`);
          allCategories.add(cat);
          allExpanded.add(cat); // Expandir todas las categorías por defecto
          const subcats = validCategories[cat];
          console.log(`🔵 [loadAvailableCategories]   - Subcategorías (tipo):`, typeof subcats);
          console.log(`🔵 [loadAvailableCategories]   - Subcategorías (es array?):`, Array.isArray(subcats));
          console.log(`🔵 [loadAvailableCategories]   - Subcategorías (valor):`, subcats);
          
          if (Array.isArray(subcats) && subcats.length > 0) {
            console.log(`🔵 [loadAvailableCategories]   ✓ Categoría ${cat} tiene ${subcats.length} subcategorías:`, subcats);
            subcats.forEach((subcat, idx) => {
              if (subcat) {
                const fullKey = `${cat}_${subcat}`;
                allCategories.add(fullKey);
                console.log(`🔵 [loadAvailableCategories]     → [${idx + 1}/${subcats.length}] Agregada subcategoría: ${fullKey}`);
              } else {
                console.warn(`🔵 [loadAvailableCategories]     ⚠ [${idx + 1}/${subcats.length}] Subcategoría nula o vacía, saltando`);
              }
            });
            console.log(`🔵 [loadAvailableCategories]   ✓ Total subcategorías agregadas para ${cat}: ${subcats.filter(s => s).length}`);
          } else {
            console.log(`🔵 [loadAvailableCategories]   ⚠ Categoría ${cat} no tiene subcategorías o subcats no es array:`, subcats);
          }
        }
      });
      
      console.log('🔵 [loadAvailableCategories] === RESULTADO FINAL ===');
      console.log('🔵 [loadAvailableCategories] Total categorías seleccionadas:', allCategories.size);
      console.log('🔵 [loadAvailableCategories] Lista de categorías seleccionadas:', Array.from(allCategories));
      console.log('🔵 [loadAvailableCategories] Total categorías expandidas:', allExpanded.size);
      console.log('🔵 [loadAvailableCategories] Lista de categorías expandidas:', Array.from(allExpanded));
      
      setSelectedCategories(allCategories);
      setExpandedCategories(allExpanded);
      console.log('🔵 [loadAvailableCategories] Estados actualizados: selectedCategories y expandedCategories');
      console.log('🔵 [loadAvailableCategories] === FIN EXITOSO ===');
    } catch (error: any) {
      console.error('🔴 [loadAvailableCategories] === ERROR ===');
      console.error('🔴 [loadAvailableCategories] Error cargando categorías disponibles:', error);
      console.error('🔴 [loadAvailableCategories] Mensaje:', error?.message);
      console.error('🔴 [loadAvailableCategories] Stack:', error?.stack);
      // En caso de error, establecer categorías vacías para no romper la UI
      setAvailableCategories({});
      categoriesLoadedRef.current = true; // Marcar como cargado para no reintentar infinitamente
      console.log('🔴 [loadAvailableCategories] Estados establecidos a valores por defecto debido al error');
    }
  }, []);

  // Ref para mantener referencia a selectedCategories
  const selectedCategoriesRef = useRef<Set<string>>(new Set());

  // Sincronizar ref con state
  useEffect(() => {
    selectedCategoriesRef.current = selectedCategories;
  }, [selectedCategories]);

  /**
   * Extrae solo las categorías principales de un conjunto de categorías/subcategorías
   * Ejemplo: ['transporte', 'transporte_car', 'electricidad_laptop'] → ['transporte', 'electricidad']
   */
  const extractMainCategories = useCallback((categories: Set<string>): string[] => {
    const mainCategories = new Set<string>();
    categories.forEach((cat) => {
      // Si contiene guion bajo, es una subcategoría
      if (cat.includes('_')) {
        const mainCat = cat.split('_')[0];
        mainCategories.add(mainCat);
      } else {
        // Es una categoría principal
        mainCategories.add(cat);
      }
    });
    return Array.from(mainCategories);
  }, []);

  const loadCategoryData = useCallback(async (skipLoadingState = false, categoriesOverride?: Set<string>) => {
    console.log('📈 [loadCategoryData] === INICIO ===', { skipLoadingState, hasOverride: !!categoriesOverride });
    try {
      if (!skipLoadingState) {
        setLoadingData(true);
      }

      if (USE_MOCK_DATA) {
        // 🎭 MOCK DATA
        console.log('📈 [loadCategoryData] Usando MOCK DATA...');
        const data = generateMockCategoryData();
        setCategoryData(data);
        console.log('📈 [loadCategoryData] Mock data loaded:', data);
        if (!skipLoadingState) {
          setLoadingData(false);
        }
        return;
      }

      // Usar categorías pasadas como parámetro o el ref como fallback
      const currentSelected = categoriesOverride || selectedCategoriesRef.current;

      // CAMBIO CLAVE: Extraer solo categorías principales para enviar al backend
      const mainCategories = extractMainCategories(currentSelected);
      console.log('📈 [loadCategoryData] Categorías principales extraídas:', mainCategories);
      console.log('📈 [loadCategoryData] Categorías seleccionadas (incluye subcategorías):', Array.from(currentSelected));

      // Construir URL con solo categorías principales
      let url = '/stats/by-category';
      if (mainCategories.length > 0) {
        const params = new URLSearchParams();
        mainCategories.forEach(cat => {
          if (cat && cat.trim()) {
            params.append('categories', cat.trim());
          }
        });
        if (params.toString()) {
          url += '?' + params.toString();
          console.log('📈 [loadCategoryData] URL con parámetros (solo principales):', url);
        }
      } else {
        console.log('📈 [loadCategoryData] No hay categorías seleccionadas, cargando todas');
      }

      console.log('📈 [loadCategoryData] Llamando API:', url);
      const data = await api<StatsByCategoryResponse>(url);
      console.log('📈 [loadCategoryData] === RESPUESTA DEL BACKEND ===');
      console.log('📈 [loadCategoryData] Total categorías en respuesta:', data?.categories?.length || 0);

      if (data) {
        setCategoryData(data);
        console.log('📈 [loadCategoryData] Datos establecidos en estado');
      } else {
        setCategoryData({ categories: [], totalKgCO2e: 0 });
      }
      console.log('📈 [loadCategoryData] === FIN EXITOSO ===');
    } catch (error: any) {
      console.error('🔴 [loadCategoryData] === ERROR ===');
      console.error('🔴 [loadCategoryData] Error:', error?.message);
      setCategoryData({ categories: [], totalKgCO2e: 0 });
    } finally {
      if (!skipLoadingState) {
        setLoadingData(false);
      }
    }
  }, [extractMainCategories]);

  const loadTimeSeriesData = useCallback(async (skipLoadingState = false, categoriesOverride?: Set<string>) => {
    console.log('📊 [loadTimeSeriesData] === INICIO ===', { skipLoadingState, hasOverride: !!categoriesOverride });
    try {
      if (!skipLoadingState) {
        setLoadingData(true);
      }

      if (USE_MOCK_DATA) {
        // 🎭 MOCK DATA
        console.log('📊 [loadTimeSeriesData] Usando MOCK DATA...');
        const data = generateMockTimeSeriesData(groupBy, months);
        setTimeSeriesData(data);
        console.log('📊 [loadTimeSeriesData] Mock data loaded:', data.data.length, 'points');
        if (!skipLoadingState) {
          setLoadingData(false);
        }
        return;
      }

      const params = new URLSearchParams();
      params.append('groupBy', groupBy);
      params.append('months', months.toString());
      if (schedule) params.append('schedule', schedule);
      if (career) params.append('career', career);
      if (month) params.append('month', month.toString());
      if (day) params.append('day', day.toString());

      // Usar categorías pasadas como parámetro o el ref como fallback
      const currentSelected = categoriesOverride || selectedCategoriesRef.current;

      // CAMBIO CLAVE: Extraer solo categorías principales para enviar al backend
      const mainCategories = extractMainCategories(currentSelected);
      console.log('📊 [loadTimeSeriesData] Categorías principales extraídas:', mainCategories);
      console.log('📊 [loadTimeSeriesData] Categorías seleccionadas (incluye subcategorías):', Array.from(currentSelected));

      if (mainCategories.length > 0) {
        mainCategories.forEach(cat => {
          if (cat && cat.trim()) {
            params.append('categories', cat.trim());
          }
        });
        console.log('📊 [loadTimeSeriesData] Categorías principales agregadas a params:', mainCategories);
      } else {
        console.log('📊 [loadTimeSeriesData] No hay categorías seleccionadas, cargando todas');
      }

      const url = `/stats/time-series?${params.toString()}`;
      console.log('📊 [loadTimeSeriesData] Llamando API:', url);
      const data = await api<TimeSeriesResponse>(url);
      console.log('📊 [loadTimeSeriesData] === RESPUESTA DEL BACKEND ===');
      console.log('📊 [loadTimeSeriesData] Total puntos de datos:', data?.data?.length || 0);

      if (data) {
        setTimeSeriesData(data);
        console.log('📊 [loadTimeSeriesData] Datos establecidos en estado');
      } else {
        setTimeSeriesData({ data: [], groupBy, totalKgCO2e: 0 });
      }
      console.log('📊 [loadTimeSeriesData] === FIN EXITOSO ===');
    } catch (error: any) {
      console.error('🔴 [loadTimeSeriesData] === ERROR ===');
      console.error('🔴 [loadTimeSeriesData] Error:', error?.message);
      setTimeSeriesData({ data: [], groupBy, totalKgCO2e: 0 });
    } finally {
      if (!skipLoadingState) {
        setLoadingData(false);
      }
    }
  }, [groupBy, months, schedule, career, month, day, extractMainCategories]);
  
  // Usar un efecto separado para selectedCategories con debounce
  // Este efecto se ejecuta cuando cambian las categorías seleccionadas
  useEffect(() => {
    console.log('🔄 [useEffect categoriesKey] === INICIO ===', {
      loading,
      categoriesLoaded: categoriesLoadedRef.current,
      isInitialLoad: isInitialLoadRef.current,
      categoriesKey,
      selectedCategoriesSize: selectedCategories.size,
      selectedCategories: Array.from(selectedCategories)
    });
    
    if (!loading && categoriesLoadedRef.current && !isInitialLoadRef.current) {
      console.log('🔄 [useEffect categoriesKey] Condiciones cumplidas, recargando gráficos con debounce...');
      
      // Capturar el estado actual de selectedCategories para usarlo en el timeout
      const currentCategories = new Set(selectedCategories);
      
      const timer = setTimeout(() => {
        console.log('🔄 [useEffect categoriesKey] Ejecutando recarga de gráficos...');
        console.log('🔄 [useEffect categoriesKey] Categorías capturadas:', Array.from(currentCategories));
        
        // Actualizar el ref antes de ejecutar las funciones
        selectedCategoriesRef.current = currentCategories;
        
        // Activar indicador de carga antes de iniciar las peticiones
        setLoadingData(true);
        
        // Recargar ambos gráficos cuando cambian las categorías
        // Pasar las categorías directamente para asegurar que se usen las correctas
        Promise.all([
          loadTimeSeriesData(true, currentCategories).catch(err => {
            console.error('🔴 [useEffect categoriesKey] Error en loadTimeSeriesData:', err);
            return null;
          }),
          loadCategoryData(true, currentCategories).catch(err => {
            console.error('🔴 [useEffect categoriesKey] Error en loadCategoryData:', err);
            return null;
          })
        ]).then(() => {
          console.log('✅ [useEffect categoriesKey] Gráficos actualizados exitosamente');
        }).catch(err => {
          console.error('🔴 [useEffect categoriesKey] Error general al actualizar gráficos:', err);
        }).finally(() => {
          // Asegurarse de desactivar el indicador de carga
          setLoadingData(false);
          console.log('🔄 [useEffect categoriesKey] Indicador de carga desactivado');
        });
      }, 300); // Debounce de 300ms para evitar demasiadas llamadas
      return () => {
        console.log('🔄 [useEffect categoriesKey] Limpiando timer...');
        clearTimeout(timer);
      };
    }
    if (categoriesLoadedRef.current) {
      isInitialLoadRef.current = false;
    }
    console.log('🔄 [useEffect categoriesKey] === FIN ===');
  }, [categoriesKey, loading, selectedCategories, loadTimeSeriesData, loadCategoryData]);

  const loadSummary = useCallback(async () => {
    console.log('📋 [loadSummary] === INICIO ===');
    try {
      if (USE_MOCK_DATA) {
        // 🎭 MOCK DATA
        console.log('📋 [loadSummary] Usando MOCK DATA...');
        const data = generateMockSummary();
        setSummary(data);
        console.log('📋 [loadSummary] Mock data loaded:', data);
        return;
      }

      console.log('📋 [loadSummary] Llamando API /stats/summary...');
      const data = await api<StatsSummary>('/stats/summary');
      console.log('📋 [loadSummary] === RESPUESTA ===');
      console.log('📋 [loadSummary] Datos recibidos:', data);
      if (data) {
        setSummary(data);
        console.log('📋 [loadSummary] Datos establecidos en estado');
      } else {
        console.warn('📋 [loadSummary] No hay datos, estableciendo estructura vacía');
        // Establecer estructura vacía si no hay datos
        setSummary({
          totalKgCO2e: 0,
          totalRecords: 0,
          thisMonthKgCO2e: 0,
          lastMonthKgCO2e: 0,
          averagePerMonth: 0,
        });
      }
      console.log('📋 [loadSummary] === FIN EXITOSO ===');
    } catch (error: any) {
      console.error('🔴 [loadSummary] === ERROR ===');
      console.error('🔴 [loadSummary] Error cargando resumen:', error);
      console.error('🔴 [loadSummary] Mensaje:', error?.message);
      // En caso de error, establecer estructura vacía
      setSummary({
        totalKgCO2e: 0,
        totalRecords: 0,
        thisMonthKgCO2e: 0,
        lastMonthKgCO2e: 0,
        averagePerMonth: 0,
      });
      console.log('🔴 [loadSummary] Estructura vacía establecida debido al error');
    }
  }, []);

  const loadAllData = useCallback(async () => {
    console.log('🚀 [loadAllData] === INICIO CARGA DE TODOS LOS DATOS ===');
    // Cargar datos de forma independiente para que un error no bloquee los demás
    const loadPromises = [
      loadAvailableCareers().catch(err => {
        console.error('🔴 [loadAllData] Error en loadAvailableCareers:', err);
        return null;
      }),
      loadAvailableCategories().catch(err => {
        console.error('🔴 [loadAllData] Error en loadAvailableCategories:', err);
        return null;
      }),
      loadCategoryData().catch(err => {
        console.error('🔴 [loadAllData] Error en loadCategoryData:', err);
        return null;
      }),
      loadSummary().catch(err => {
        console.error('🔴 [loadAllData] Error en loadSummary:', err);
        return null;
      }),
      // NUEVO: Cargar datos raw para filtrado granular
      loadRawHistoryData().catch(err => {
        console.error('🔴 [loadAllData] Error en loadRawHistoryData:', err);
        return null;
      }),
    ];

    console.log('🚀 [loadAllData] Esperando a que se carguen los datos iniciales...');
    await Promise.all(loadPromises);
    console.log('🚀 [loadAllData] Datos iniciales cargados, esperando 100ms antes de cargar time series...');

    setTimeout(() => {
      console.log('🚀 [loadAllData] Cargando time series...');
      loadTimeSeriesData().catch(err => {
        console.error('🔴 [loadAllData] Error en loadTimeSeriesData:', err);
      });
    }, 100);
    console.log('🚀 [loadAllData] === FIN ===');
  }, [loadAvailableCareers, loadAvailableCategories, loadTimeSeriesData, loadCategoryData, loadSummary, loadRawHistoryData]);

  // Efectos
  useEffect(() => {
    // ========================================================================
    // SOLUCIÓN EXPERTA: NO VALIDAR AUTH EN FRONTEND
    // ========================================================================
    // Esperar a que Auth0 termine de cargar, luego cargar datos directamente.
    // Si el backend responde 401, el interceptor redirigirá automáticamente.

    if (auth0Loading) {
      return; // Esperar a que Auth0 termine
    }

    // Cargar datos independientemente del estado de autenticación
    // El backend manejará la autenticación y el interceptor manejará los 401
    setLoading(false);
    loadAllData();
  }, [auth0Loading, loadAllData]);

  // Cargar categorías solo una vez
  useEffect(() => {
    console.log('⚡ [useEffect categorías] === INICIO ===');
    console.log('⚡ [useEffect categorías] loading:', loading);
    console.log('⚡ [useEffect categorías] categoriesLoadedRef.current:', categoriesLoadedRef.current);
    
    if (!loading && !categoriesLoadedRef.current) {
      console.log('⚡ [useEffect categorías] Condiciones cumplidas, cargando categorías...');
      loadAvailableCareers();
      loadAvailableCategories();
    } else {
      console.log('⚡ [useEffect categorías] Condiciones no cumplidas, saltando carga');
    }
    console.log('⚡ [useEffect categorías] === FIN ===');
  }, [loading, loadAvailableCareers, loadAvailableCategories]);

  // Cargar datos cuando cambian los filtros (con debounce)
  // Este efecto se ejecuta cuando cambian los filtros (groupBy, months, schedule, career, month, day)
  useEffect(() => {
    console.log('🔄 [useEffect filtros] === INICIO ===', {
      loading,
      categoriesLoaded: categoriesLoadedRef.current,
      isInitialLoad: isInitialLoadRef.current,
      groupBy,
      months,
      schedule,
      career,
      month,
      day,
      selectedCategoriesSize: selectedCategories.size
    });
    
    if (!loading && categoriesLoadedRef.current && !isInitialLoadRef.current) {
      console.log('🔄 [useEffect filtros] Condiciones cumplidas, recargando gráficos con debounce...');
      
      // Capturar el estado actual de selectedCategories
      const currentCategories = new Set(selectedCategories);
      
      const timer = setTimeout(() => {
        console.log('🔄 [useEffect filtros] Ejecutando recarga de gráficos...');
        console.log('🔄 [useEffect filtros] Categorías capturadas:', Array.from(currentCategories));
        
        // Actualizar el ref antes de ejecutar las funciones
        selectedCategoriesRef.current = currentCategories;
        
        // Activar indicador de carga
        setLoadingData(true);
        
        // Recargar ambos gráficos cuando cambian los filtros
        // Pasar las categorías directamente para asegurar que se usen las correctas
        Promise.all([
          loadTimeSeriesData(true, currentCategories).catch(err => {
            console.error('🔴 [useEffect filtros] Error en loadTimeSeriesData:', err);
            return null;
          }),
          loadCategoryData(true, currentCategories).catch(err => {
            console.error('🔴 [useEffect filtros] Error en loadCategoryData:', err);
            return null;
          })
        ]).then(() => {
          console.log('✅ [useEffect filtros] Gráficos actualizados exitosamente');
        }).catch(err => {
          console.error('🔴 [useEffect filtros] Error general al actualizar gráficos:', err);
        }).finally(() => {
          setLoadingData(false);
          console.log('🔄 [useEffect filtros] Indicador de carga desactivado');
        });
      }, 300); // Debounce de 300ms para evitar demasiadas llamadas
      return () => {
        console.log('🔄 [useEffect filtros] Limpiando timer...');
        clearTimeout(timer);
      };
    }
    console.log('🔄 [useEffect filtros] === FIN ===');
  }, [groupBy, months, schedule, career, month, day, loading, selectedCategories, loadTimeSeriesData, loadCategoryData]);

  const handleLogout = () => {
    if (auth0User) {
      window.location.href = '/api/auth/logout';
    } else {
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      // Usar window.location.href para evitar problemas con RSC
      window.location.href = '/login';
    }
  };

  const toggleCategory = (category: string) => {
    console.log('🔄 [toggleCategory] === INICIO ===', { category });
    setSelectedCategories(prev => {
      const newSelected = new Set(prev);
      const wasSelected = newSelected.has(category);
      
      if (wasSelected) {
        newSelected.delete(category);
        console.log('🔄 [toggleCategory] Categoría deseleccionada:', category);
      } else {
        newSelected.add(category);
        console.log('🔄 [toggleCategory] Categoría seleccionada:', category);
      }
      
      console.log('🔄 [toggleCategory] Total categorías seleccionadas:', newSelected.size);
      console.log('🔄 [toggleCategory] Lista de categorías:', Array.from(newSelected));
      
      // Incrementar key para forzar actualización de gráficos
      setCategoriesKey(prev => {
        const newKey = prev + 1;
        console.log('🔄 [toggleCategory] categoriesKey actualizado:', newKey);
        return newKey;
      });
      
      return newSelected;
    });
    console.log('🔄 [toggleCategory] === FIN ===');
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
    console.log('🔄 [selectAllCategories] === INICIO ===');
    const allCategories = new Set<string>();
    Object.keys(availableCategories).forEach(cat => {
      allCategories.add(cat);
      (availableCategories[cat] || []).forEach(subcat => {
        allCategories.add(`${cat}_${subcat}`);
      });
    });
    console.log('🔄 [selectAllCategories] Total categorías a seleccionar:', allCategories.size);
    setSelectedCategories(allCategories);
    setCategoriesKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 [selectAllCategories] categoriesKey actualizado:', newKey);
      return newKey;
    });
    console.log('🔄 [selectAllCategories] === FIN ===');
  };

  const deselectAllCategories = () => {
    console.log('🔄 [deselectAllCategories] === INICIO ===');
    setSelectedCategories(new Set());
    setCategoriesKey(prev => {
      const newKey = prev + 1;
      console.log('🔄 [deselectAllCategories] categoriesKey actualizado:', newKey);
      return newKey;
    });
    console.log('🔄 [deselectAllCategories] === FIN ===');
  };

  const getCategoryIcon = useCallback((category: string): string => {
    const icons: Record<string, string> = {
      electricidad: '⚡',
      transporte: '🚗',
      alimentacion: '🍽️',
      agua: '💧',
      residuos: '🗑️',
      otros: '📊',
    };
    return icons[category] || '📋';
  }, []);

  const getCategoryLabel = useCallback((category: string): string => {
    const labels: Record<string, string> = {
      electricidad: 'Electricidad',
      transporte: 'Transporte',
      alimentacion: 'Alimentación',
      agua: 'Agua',
      residuos: 'Residuos',
      otros: 'Otros',
    };
    return labels[category] || category.charAt(0).toUpperCase() + category.slice(1);
  }, []);

  const getTransportLabel = useCallback((subcategory: string): string => {
    if (!subcategory) return subcategory;
    
    // Mapeo completo de todas las opciones de transporte
    const transportLabels: Record<string, string> = {
      // Modos simples (sin fuelType)
      walking: '🚶 Caminando',
      bicycle: '🚲 Bicicleta',
      metro: '🚇 Metro/Tren',
      bus: '🚌 Bus/Transporte Público',
      motorcycle: '🏍️ Motocicleta',
      plane: '✈️ Avión',
      // Autos con tipos de combustible
      car_gasoline: '🚗 Auto (Gasolina)',
      car_diesel: '🚗 Auto (Diésel)',
      car_electric: '🔌 Auto Eléctrico',
      car_hybrid: '🔋 Auto Híbrido',
      // Fallback para casos donde viene solo "car" (sin fuelType)
      car: '🚗 Auto',
    };
    
    // Si existe una etiqueta directa, usarla
    if (transportLabels[subcategory]) {
      return transportLabels[subcategory];
    }
    
    // Si no, intentar parsear mode_fuel
    const parts = subcategory.split('_');
    if (parts.length >= 2) {
      const mode = parts[0];
      const fuel = parts.slice(1).join('_'); // Por si hay múltiples guiones bajos
      
      const modeLabels: Record<string, string> = {
        car: '🚗 Auto',
        bus: '🚌 Bus',
        metro: '🚇 Metro/Tren',
        bicycle: '🚲 Bicicleta',
        walking: '🚶 Caminando',
        motorcycle: '🏍️ Motocicleta',
        plane: '✈️ Avión',
      };
      
      const fuelLabels: Record<string, string> = {
        gasoline: 'Gasolina',
        diesel: 'Diésel',
        electric: 'Eléctrico',
        hybrid: 'Híbrido',
      };
      
      const modeLabel = modeLabels[mode] || mode;
      const fuelLabel = fuel ? ` (${fuelLabels[fuel] || fuel})` : '';
      return `${modeLabel}${fuelLabel}`;
    }
    
    // Fallback final
    return subcategory;
  }, []);

  const getElectricityLabel = useCallback((subcategory: string): string => {
    const applianceLabels: Record<string, string> = {
      laptop: '💻 Laptop',
      desktop: '🖥️ PC Escritorio',
      tablet: '📱 Tablet',
      celular: '📱 Celular',
      monitor: '🖥️ Monitor',
      lampara: '💡 Lámpara LED',
      ventilador: '🌀 Ventilador',
      cargador: '🔌 Cargadores Múltiples',
      router: '📡 Router WiFi',
      impresora: '🖨️ Impresora',
      altavoces: '🔊 Altavoces',
      microondas: '🍽️ Microondas',
      refrigerador: '❄️ Refrigerador Pequeño',
      cafetera: '☕ Cafetera',
      plancha: '👔 Plancha',
      secador: '💨 Secador de Pelo',
    };
    return applianceLabels[subcategory] || subcategory;
  }, []);

  const getWasteLabel = useCallback((subcategory: string): string => {
    if (!subcategory) return subcategory;

    // Mapeo completo de subcategorías de residuos
    const wasteLabels: Record<string, string> = {
      // Orgánicos
      'organic_mixed': '🌱 Orgánicos (Gestión Mixta)',
      'organic_recycling': '🌱 Orgánicos (Reciclaje)',
      'organic_composting': '🌱 Orgánicos (Compostaje)',
      'organic_landfill': '🌱 Orgánicos (Relleno Sanitario)',
      // Papel y Cartón
      'paper_mixed': '📄 Papel y Cartón (Gestión Mixta)',
      'paper_recycling': '📄 Papel y Cartón (Reciclaje)',
      'paper_composting': '📄 Papel y Cartón (Compostaje)',
      'paper_landfill': '📄 Papel y Cartón (Relleno Sanitario)',
      // Plásticos
      'plastic_mixed': '🥤 Plásticos (Gestión Mixta)',
      'plastic_recycling': '🥤 Plásticos (Reciclaje)',
      'plastic_composting': '🥤 Plásticos (Compostaje)',
      'plastic_landfill': '🥤 Plásticos (Relleno Sanitario)',
      // Vidrio
      'glass_mixed': '🍾 Vidrio (Gestión Mixta)',
      'glass_recycling': '🍾 Vidrio (Reciclaje)',
      'glass_composting': '🍾 Vidrio (Compostaje)',
      'glass_landfill': '🍾 Vidrio (Relleno Sanitario)',
      // Metales
      'metal_mixed': '🔩 Metales (Gestión Mixta)',
      'metal_recycling': '🔩 Metales (Reciclaje)',
      'metal_composting': '🔩 Metales (Compostaje)',
      'metal_landfill': '🔩 Metales (Relleno Sanitario)',
      // Otros residuos
      'other_mixed': '🗑️ Otros Residuos (Gestión Mixta)',
      'other_recycling': '🗑️ Otros Residuos (Reciclaje)',
      'other_composting': '🗑️ Otros Residuos (Compostaje)',
      'other_landfill': '🗑️ Otros Residuos (Relleno Sanitario)',
    };

    // Si existe una etiqueta directa, usarla
    if (wasteLabels[subcategory]) {
      return wasteLabels[subcategory];
    }

    // Si no, intentar parsear wasteType_disposalMethod
    const parts = subcategory.split('_');
    if (parts.length >= 2) {
      const wasteType = parts[0];
      const disposalMethod = parts.slice(1).join('_'); // Por si hay múltiples guiones bajos

      const wasteTypeLabels: Record<string, string> = {
        organic: '🌱 Orgánicos',
        paper: '📄 Papel y Cartón',
        plastic: '🥤 Plásticos',
        glass: '🍾 Vidrio',
        metal: '🔩 Metales',
        other: '🗑️ Otros Residuos',
      };

      const disposalLabels: Record<string, string> = {
        mixed: 'Gestión Mixta',
        recycling: 'Reciclaje',
        composting: 'Compostaje',
        landfill: 'Relleno Sanitario',
      };

      const typeLabel = wasteTypeLabels[wasteType] || wasteType;
      const methodLabel = disposalMethod ? ` (${disposalLabels[disposalMethod] || disposalMethod})` : '';
      return `${typeLabel}${methodLabel}`;
    }

    // Fallback final
    return subcategory;
  }, []);

  const toNumberOrDefault = useCallback((value: unknown, fallback = 0): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, []);

  // ============================================================================
  // FUNCIONES HELPER PARA EXTRAER SUBCATEGORÍAS DE DATOS DEL BACKEND
  // ============================================================================

  /**
   * Extrae la subcategoría de transporte desde input_json
   * Formato: {transportMode}_{fuelType} o solo {transportMode}
   * Ejemplos: car_gasoline, bus, bicycle_electric
   */
  const extractTransportSubcategory = useCallback((input: any): string => {
    if (!input) return '';
    const mode = input.transportMode || '';
    const fuel = input.fuelType || '';
    // Si tiene fuelType, combinar mode_fuel, si no solo mode
    return fuel ? `${mode}_${fuel}` : mode;
  }, []);

  /**
   * Extrae subcategorías de electricidad desde input_json
   * Retorna array de electrodomésticos seleccionados
   * Ejemplo: ['laptop', 'monitor', 'desktop']
   */
  const extractElectricitySubcategories = useCallback((input: any): string[] => {
    if (!input || !input.selectedAppliances) return [];
    // selectedAppliances puede ser array o string JSON
    if (Array.isArray(input.selectedAppliances)) {
      return input.selectedAppliances.map((item: any) =>
        typeof item === 'string' ? item : item.appliance || item.type || ''
      ).filter(Boolean);
    }
    return [];
  }, []);

  /**
   * Extrae subcategorías de residuos desde input_json
   * Retorna array de combinaciones {wasteType}_{disposalMethod}
   * Ejemplo: ['organic_composting', 'plastic_recycling']
   */
  const extractWasteSubcategories = useCallback((input: any): string[] => {
    if (!input || !input.wasteItems) return [];
    const disposalMethod = input.disposalMethod || 'mixed';

    // wasteItems es un array de items con wasteType
    if (Array.isArray(input.wasteItems)) {
      return input.wasteItems.map((item: any) => {
        const wasteType = item.wasteType || item.type || '';
        return wasteType ? `${wasteType}_${disposalMethod}` : '';
      }).filter(Boolean);
    }
    return [];
  }, []);

  /**
   * Determina si un punto de datos debe incluirse según las subcategorías seleccionadas
   *
   * LÓGICA MEJORADA PARA ELECTRICIDAD:
   * - Si NO hay subcategorías de electricidad seleccionadas → incluir si categoría principal está seleccionada
   * - Si hay ALGUNAS subcategorías seleccionadas:
   *   * MODO ESTRICTO: Solo incluir si TODOS los electrodomésticos del cálculo están seleccionados
   *   * Esto evita duplicar emisiones cuando se deseleccionan algunos electrodomésticos
   *
   * @param category - Categoría del cálculo
   * @param input - Input JSON del cálculo
   * @param selectedSubcategories - Set de subcategorías seleccionadas
   * @returns true si el dato debe incluirse
   */
  const shouldIncludeDataPoint = useCallback((
    category: string,
    input: any,
    selectedSubcategories: Set<string>
  ): boolean => {
    // Si no hay filtros de subcategorías para esta categoría, incluir todo
    const categoryPrefix = `${category}_`;
    const hasSubcategoryFilters = Array.from(selectedSubcategories).some(
      (key) => key.startsWith(categoryPrefix)
    );

    if (!hasSubcategoryFilters) {
      // Si la categoría principal está seleccionada, incluir
      return selectedSubcategories.has(category);
    }

    // Verificar subcategorías específicas
    switch (category) {
      case 'transporte': {
        const subcategory = extractTransportSubcategory(input);
        return !!subcategory && selectedSubcategories.has(`transporte_${subcategory}`);
      }

      case 'electricidad': {
        const subcategories = extractElectricitySubcategories(input);

        if (subcategories.length === 0) {
          return false; // Sin electrodomésticos, excluir
        }

        // MODO ESTRICTO: Solo incluir si TODOS los electrodomésticos están seleccionados
        // Esto evita contar parcialmente un cálculo que tiene múltiples electrodomésticos
        const allSelected = subcategories.every((subcat) =>
          selectedSubcategories.has(`electricidad_${subcat}`)
        );

        console.log(`🔍 [shouldIncludeDataPoint] Electricidad:`, {
          subcategories,
          allSelected,
          selectedFilters: Array.from(selectedSubcategories).filter(s => s.startsWith('electricidad_'))
        });

        return allSelected;
      }

      case 'residuos': {
        const subcategories = extractWasteSubcategories(input);
        // Para residuos, incluir si al menos un tipo está seleccionado
        // (un cálculo puede tener múltiples tipos de residuos)
        return subcategories.some((subcat) =>
          selectedSubcategories.has(`residuos_${subcat}`)
        );
      }

      default:
        // Para categorías sin subcategorías, verificar categoría principal
        return selectedSubcategories.has(category);
    }
  }, [extractTransportSubcategory, extractElectricitySubcategories, extractWasteSubcategories]);

  // ============================================================================
  // FILTRADO Y AGREGACIÓN LOCAL DE DATOS RAW
  // ============================================================================

  /**
   * Filtra datos raw según subcategorías seleccionadas
   * Este es el corazón del filtrado granular
   */
  const filteredRawData = useMemo(() => {
    console.log('🔍 [filteredRawData] === INICIO FILTRADO ===');
    console.log('🔍 [filteredRawData] Total datos raw:', rawHistoryData.length);
    console.log('🔍 [filteredRawData] Categorías seleccionadas:', Array.from(selectedCategories));

    if (rawHistoryData.length === 0) {
      console.log('🔍 [filteredRawData] No hay datos raw, retornando vacío');
      return [];
    }

    if (selectedCategories.size === 0) {
      console.log('🔍 [filteredRawData] No hay categorías seleccionadas, retornando todos los datos');
      return rawHistoryData;
    }

    const filtered = rawHistoryData.filter(item => {
      const shouldInclude = shouldIncludeDataPoint(item.category, item.input, selectedCategories);
      return shouldInclude;
    });

    console.log('🔍 [filteredRawData] Datos filtrados:', filtered.length);
    console.log('🔍 [filteredRawData] === FIN FILTRADO ===');
    return filtered;
  }, [rawHistoryData, selectedCategories, shouldIncludeDataPoint]);

  /**
   * Agregar datos filtrados por categoría para gráficos
   */
  const categoryStats = useMemo(() => {
    console.log('📊 [categoryStats] === INICIO AGREGACIÓN ===');

    // Agrupar por categoría
    const grouped = new Map<string, { totalKgCO2e: number; recordCount: number }>();

    filteredRawData.forEach(item => {
      const existing = grouped.get(item.category) || { totalKgCO2e: 0, recordCount: 0 };
      existing.totalKgCO2e += item.kgCO2e;
      existing.recordCount += 1;
      grouped.set(item.category, existing);
    });

    // Convertir a array
    const stats = Array.from(grouped.entries()).map(([category, data]) => ({
      category,
      totalKgCO2e: data.totalKgCO2e,
      recordCount: data.recordCount,
      percentage: 0 // Se calculará después
    }));

    // Calcular porcentajes
    const total = stats.reduce((sum, s) => sum + s.totalKgCO2e, 0);
    stats.forEach(s => {
      s.percentage = total > 0 ? (s.totalKgCO2e / total) * 100 : 0;
    });

    console.log('📊 [categoryStats] Total categorías:', stats.length);
    console.log('📊 [categoryStats] Total kg CO2e:', total);
    console.log('📊 [categoryStats] === FIN AGREGACIÓN ===');

    return stats;
  }, [filteredRawData]);

  const timeSeriesPoints = useMemo(() => {
    const points = timeSeriesData?.data ?? [];
    console.log('📊 [useMemo timeSeriesPoints] Datos actualizados:', {
      totalPoints: points.length,
      totalKgCO2e: timeSeriesData?.totalKgCO2e || 0,
      sample: points.slice(0, 3).map(p => ({ period: p.period, total: p.totalKgCO2e }))
    });
    return points;
  }, [timeSeriesData]);
  
  const pieChartData = useMemo(
    () => {
      // Usar datos filtrados localmente en lugar de categoryData del backend
      const total = categoryStats.reduce((sum, s) => sum + s.totalKgCO2e, 0);
      const data = categoryStats.map((entry, index) => {
        const value = toNumberOrDefault(entry.totalKgCO2e);
        const percentage = entry.percentage; // Ya calculado en categoryStats
        return {
          id: entry.category,
          label: getCategoryLabel(entry.category),
          value: value,
          percentage: percentage,
          color: COLORS[index % COLORS.length],
        };
      });
      console.log('📊 [useMemo pieChartData] Datos actualizados (filtrados):', {
        totalItems: data.length,
        totalValue: total,
        calculatedTotal: data.reduce((sum, d) => sum + d.value, 0),
        items: data.map(d => ({ id: d.id, label: d.label, value: d.value, percentage: d.percentage.toFixed(2) + '%' }))
      });
      return data;
    },
    [categoryStats, getCategoryLabel, toNumberOrDefault],
  );
console.log("asdasdasdasdasd,",pieChartData )

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
    <div className="min-h-dvh bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center shadow-md">
                <span className="text-white text-xl font-bold">E</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">EcoEstudiante</h1>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-4 py-2 text-sm bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all shadow-sm hover:shadow-md flex items-center gap-2 font-medium"
                title={sidebarOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              >
                <span className="text-lg">{sidebarOpen ? '◀' : '▶'}</span>
                <span className="hidden sm:inline">Filtros</span>
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 text-sm bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all shadow-sm hover:shadow-md font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-sm hover:shadow-md font-medium"
              >
                Historial
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-all shadow-sm hover:shadow-md font-medium"
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
        <CategorySidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          availableCategories={availableCategories}
          selectedCategories={selectedCategories}
          expandedCategories={expandedCategories}
          categoryData={categoryData}
          summary={summary}
          onSelectAll={selectAllCategories}
          onDeselectAll={deselectAllCategories}
          onReload={() => {
            categoriesLoadedRef.current = false;
            loadAvailableCategories(true);
          }}
          onToggleCategory={toggleCategory}
          onToggleExpansion={toggleCategoryExpansion}
          onExpandAll={() => {
            const allExpanded = new Set(Object.keys(availableCategories));
            setExpandedCategories(allExpanded);
          }}
          onCollapseAll={() => setExpandedCategories(new Set())}
          getCategoryIcon={getCategoryIcon}
          getCategoryLabel={getCategoryLabel}
          getCategoryStats={getCategoryStats}
          getSubcategoryLabel={(category: string, subcategory: string) => {
            if (category === 'transporte') return getTransportLabel(subcategory);
            if (category === 'electricidad') return getElectricityLabel(subcategory);
            if (category === 'residuos') return getWasteLabel(subcategory);
            return subcategory;
          }}
        />

        {/* Toggle Button when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-emerald-600 text-white px-4 py-3 rounded-r-xl shadow-2xl hover:bg-emerald-700 transition-all z-20 flex items-center gap-2 group"
            title="Mostrar filtros de emisiones"
          >
            <span className="text-xl font-bold">→</span>
            <span className="text-sm font-medium hidden sm:inline whitespace-nowrap">
              Filtros
            </span>
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
          </button>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title */}
        <div className="mb-8 bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-2">
            📊 Análisis de Huella de Carbono
          </h2>
          <p className="text-gray-700 font-medium">
            Visualiza y analiza tus registros de huella de carbono con gráficos dinámicos e interactivos
          </p>
        </div>

        {/* Summary Cards */}
        <SummaryCards summary={summary} loading={loading} />

        {/* Filters Panel - Actualización automática activada */}
        <FiltersPanel
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          months={months}
          onMonthsChange={setMonths}
          schedule={schedule}
          onScheduleChange={setSchedule}
          career={career}
          onCareerChange={setCareer}
          availableCareers={availableCareers}
          month={month}
          onMonthChange={setMonth}
          day={day}
          onDayChange={setDay}
          onClear={() => {
            setSchedule('');
            setCareer('');
            setMonth('');
            setDay('');
            setMonths(12);
            setGroupBy('month');
            // Los gráficos se actualizarán automáticamente por el useEffect (líneas 807-863)
          }}
          loading={loadingData}
        />

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Time Series Line Chart - ECharts Professional */}
          <TimeSeriesLineChart
            data={timeSeriesPoints.map(point => ({
              period: point.period,
              emissions: toNumberOrDefault(point.totalKgCO2e),
              records: point.recordCount,
            }))}
            title="Evolución Temporal de Emisiones"
            loading={loadingData}
            height={400}
            showExport={true}
            color="#10b981"
          />

          {/* Category Pie Chart - ECharts Professional */}
          <CategoryPieChart
            data={pieChartData.map(item => ({
              name: item.label,
              value: item.value,
              records: categoryStats.find(s => s.category === item.id)?.recordCount || 0,
            }))}
            title="Distribución por Categoría"
            loading={loadingData}
            height={450}
            showExport={true}
          />
        </div>

        {/* Bar Charts Row - ECharts Professional */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Category Bar Chart - Emissions */}
          <CategoryBarChart
            data={categoryStats.map(entry => ({
              name: getCategoryLabel(entry.category),
              value: toNumberOrDefault(entry.totalKgCO2e),
              records: entry.recordCount,
            }))}
            title="Emisiones por Categoría"
            loading={loadingData}
            height={400}
            showExport={true}
            mode="emissions"
          />

          {/* Category Bar Chart - Records Count */}
          <CategoryBarChart
            data={categoryStats.map(entry => ({
              name: getCategoryLabel(entry.category),
              value: toNumberOrDefault(entry.totalKgCO2e),
              records: entry.recordCount,
            }))}
            title="Registros por Categoría"
            loading={loadingData}
            height={400}
            showExport={true}
            mode="records"
          />
        </div>

        {/* Time Series Bar Chart - ECharts Professional */}
        <CategoryBarChart
          data={timeSeriesPoints.map(point => ({
            name: point.period,
            value: toNumberOrDefault(point.totalKgCO2e),
            records: point.recordCount,
          }))}
          title={`Emisiones por ${groupBy === 'month' ? 'Mes' : 'Día'}`}
          loading={loadingData}
          height={450}
          showExport={true}
          mode="emissions"
          className="mb-8"
        />
          </div>
        </main>
      </div>
    </div>
  );
}

