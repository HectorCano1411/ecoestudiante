/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useEffect, useState, useCallback, useRef, useMemo, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import { BarChart } from '@mui/x-charts/BarChart';
import { PieChart } from '@mui/x-charts/PieChart';
import { LineChart } from '@mui/x-charts/LineChart';
import { api } from '@/lib/api-client';

type ValueFormatter<T = number | null> = (value: T) => string;

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

interface ResponsiveChartProps {
  height: number;
  children: (width: number) => ReactNode;
}

function ResponsiveChart({ height, children }: ResponsiveChartProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateWidth = () => setWidth(element.clientWidth);
    updateWidth();

    if (typeof window === 'undefined') {
      return;
    }

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver((entries) => {
        if (!entries.length) return;
        setWidth(entries[0].contentRect.width);
      });
      observer.observe(element);
      return () => observer.disconnect();
    }

    const handleResize = () => updateWidth();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div ref={containerRef} style={{ width: '100%', height }}>
      {width > 0 && children(width)}
    </div>
  );
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

  // Funciones de carga de datos
  const loadAvailableCareers = useCallback(async () => {
    try {
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

  const loadCategoryData = useCallback(async (skipLoadingState = false, categoriesOverride?: Set<string>) => {
    console.log('📈 [loadCategoryData] === INICIO ===', { skipLoadingState, hasOverride: !!categoriesOverride });
    try {
      if (!skipLoadingState) {
        setLoadingData(true); // Activar indicador de carga solo si no se omite
      }
      
      // Usar categorías pasadas como parámetro o el ref como fallback
      const currentSelected = categoriesOverride || selectedCategoriesRef.current;
      const categoriesArray = currentSelected ? Array.from(currentSelected) : [];
      console.log('📈 [loadCategoryData] Categorías seleccionadas:', categoriesArray);
      console.log('📈 [loadCategoryData] Total categorías:', categoriesArray.length);
      
      // Construir URL con parámetros de categorías
      // Si no hay categorías seleccionadas, no enviar el parámetro para cargar todas
      let url = '/stats/by-category';
      if (categoriesArray.length > 0) {
        const params = new URLSearchParams();
        categoriesArray.forEach(cat => {
          if (cat && cat.trim()) {
            params.append('categories', cat.trim());
          }
        });
        if (params.toString()) {
          url += '?' + params.toString();
          console.log('📈 [loadCategoryData] URL con parámetros:', url);
        } else {
          console.log('📈 [loadCategoryData] No hay categorías válidas, cargando todas');
        }
      } else {
        console.log('📈 [loadCategoryData] No hay categorías seleccionadas, cargando todas (sin filtros)');
      }
      
      console.log('📈 [loadCategoryData] Llamando API:', url);
      const data = await api<StatsByCategoryResponse>(url);
      console.log('📈 [loadCategoryData] === RESPUESTA ===');
      console.log('📈 [loadCategoryData] Datos recibidos:', data);
      console.log('📈 [loadCategoryData] Total categorías en respuesta:', data?.categories?.length || 0);
      console.log('📈 [loadCategoryData] Total kg CO2e:', data?.totalKgCO2e || 0);
      
      if (data) {
        setCategoryData(data);
        console.log('📈 [loadCategoryData] Datos establecidos en estado exitosamente');
      } else {
        console.warn('📈 [loadCategoryData] No hay datos, estableciendo estructura vacía');
        // Establecer estructura vacía si no hay datos
        setCategoryData({ categories: [], totalKgCO2e: 0 });
      }
      console.log('📈 [loadCategoryData] === FIN EXITOSO ===');
    } catch (error: any) {
      console.error('🔴 [loadCategoryData] === ERROR ===');
      console.error('🔴 [loadCategoryData] Error cargando datos por categoría:', error);
      console.error('🔴 [loadCategoryData] Mensaje:', error?.message);
      console.error('🔴 [loadCategoryData] Stack:', error?.stack);
      // En caso de error, establecer estructura vacía
      setCategoryData({ categories: [], totalKgCO2e: 0 });
      console.log('🔴 [loadCategoryData] Estructura vacía establecida debido al error');
    } finally {
      if (!skipLoadingState) {
        setLoadingData(false); // Desactivar indicador de carga solo si no se omite
        console.log('📈 [loadCategoryData] LoadingData establecido a false');
      }
    }
  }, []);

  const loadTimeSeriesData = useCallback(async (skipLoadingState = false, categoriesOverride?: Set<string>) => {
    console.log('📊 [loadTimeSeriesData] === INICIO ===', { skipLoadingState, hasOverride: !!categoriesOverride });
    try {
      if (!skipLoadingState) {
        setLoadingData(true);
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
      const categoriesArray = currentSelected ? Array.from(currentSelected) : [];
      console.log('📊 [loadTimeSeriesData] Categorías seleccionadas:', categoriesArray);
      console.log('📊 [loadTimeSeriesData] Total categorías:', categoriesArray.length);
      
      if (categoriesArray.length > 0) {
        categoriesArray.forEach(cat => {
          if (cat && cat.trim()) {
            params.append('categories', cat.trim());
          }
        });
        console.log('📊 [loadTimeSeriesData] Categorías agregadas a params:', categoriesArray.filter(c => c && c.trim()));
      } else {
        console.log('📊 [loadTimeSeriesData] No hay categorías seleccionadas, cargando todas (sin filtros)');
      }
      
      const url = `/stats/time-series?${params.toString()}`;
      console.log('📊 [loadTimeSeriesData] Llamando API:', url);
      const data = await api<TimeSeriesResponse>(url);
      console.log('📊 [loadTimeSeriesData] === RESPUESTA ===');
      console.log('📊 [loadTimeSeriesData] Datos recibidos:', data);
      console.log('📊 [loadTimeSeriesData] Total puntos de datos:', data?.data?.length || 0);
      console.log('📊 [loadTimeSeriesData] Total kg CO2e:', data?.totalKgCO2e || 0);
      
      // Asegurarse de que data sea válido
      if (data) {
        setTimeSeriesData(data);
        console.log('📊 [loadTimeSeriesData] Datos establecidos en estado exitosamente');
      } else {
        console.warn('📊 [loadTimeSeriesData] No hay datos, estableciendo estructura vacía');
        // Si no hay datos, establecer estructura vacía
        setTimeSeriesData({ data: [], groupBy, totalKgCO2e: 0 });
      }
      console.log('📊 [loadTimeSeriesData] === FIN EXITOSO ===');
    } catch (error: any) {
      console.error('🔴 [loadTimeSeriesData] === ERROR ===');
      console.error('🔴 [loadTimeSeriesData] Error cargando datos temporales:', error);
      console.error('🔴 [loadTimeSeriesData] Mensaje:', error?.message);
      console.error('🔴 [loadTimeSeriesData] Stack:', error?.stack);
      // En caso de error, establecer estructura vacía para que la UI no se quede bloqueada
      setTimeSeriesData({ data: [], groupBy, totalKgCO2e: 0 });
      console.log('🔴 [loadTimeSeriesData] Estructura vacía establecida debido al error');
    } finally {
      if (!skipLoadingState) {
        setLoadingData(false);
        console.log('📊 [loadTimeSeriesData] LoadingData establecido a false');
      }
    }
  }, [groupBy, months, schedule, career, month, day]);
  
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
    ];
    
    console.log('🚀 [loadAllData] Esperando a que se carguen los datos iniciales...');
    // Esperar a que se carguen las categorías antes de cargar time series
    await Promise.all(loadPromises);
    console.log('🚀 [loadAllData] Datos iniciales cargados, esperando 100ms antes de cargar time series...');
    
    // Cargar time series después de que las categorías estén disponibles
    // Esto asegura que selectedCategoriesRef esté actualizado
    setTimeout(() => {
      console.log('🚀 [loadAllData] Cargando time series...');
      loadTimeSeriesData().catch(err => {
        console.error('🔴 [loadAllData] Error en loadTimeSeriesData:', err);
      });
    }, 100);
    console.log('🚀 [loadAllData] === FIN ===');
  }, [loadAvailableCareers, loadAvailableCategories, loadTimeSeriesData, loadCategoryData, loadSummary]);

  // Efectos
  useEffect(() => {
    console.log('⚡ [useEffect inicial] === INICIO ===');
    console.log('⚡ [useEffect inicial] auth0Loading:', auth0Loading);
    console.log('⚡ [useEffect inicial] auth0User:', auth0User ? 'presente' : 'ausente');
    console.log('⚡ [useEffect inicial] authToken:', localStorage.getItem('authToken') ? 'presente' : 'ausente');
    
    if (auth0Loading) {
      console.log('⚡ [useEffect inicial] Auth0 aún cargando, esperando...');
      return;
    }

    if (!auth0User && !localStorage.getItem('authToken')) {
      console.log('⚡ [useEffect inicial] No hay usuario autenticado, redirigiendo a login...');
      router.push('/login');
      return;
    }

    console.log('⚡ [useEffect inicial] Usuario autenticado, iniciando carga de datos...');
    setLoading(false);
    loadAllData();
    console.log('⚡ [useEffect inicial] === FIN ===');
  }, [router, auth0User, auth0Loading, loadAllData]);

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
      router.push('/login');
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

  const toNumberOrDefault = useCallback((value: unknown, fallback = 0): number => {
    if (typeof value === 'number') {
      return Number.isFinite(value) ? value : fallback;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }, []);

  // Memoizar datos de gráficos para optimizar renderizado y agregar logs
  const timeSeriesPoints = useMemo(() => {
    const points = timeSeriesData?.data ?? [];
    console.log('📊 [useMemo timeSeriesPoints] Datos actualizados:', {
      totalPoints: points.length,
      totalKgCO2e: timeSeriesData?.totalKgCO2e || 0,
      sample: points.slice(0, 3).map(p => ({ period: p.period, total: p.totalKgCO2e }))
    });
    return points;
  }, [timeSeriesData]);
  
  const categoryStats = useMemo(() => {
    const stats = categoryData?.categories ?? [];
    console.log('📊 [useMemo categoryStats] Datos actualizados:', {
      totalCategories: stats.length,
      totalKgCO2e: categoryData?.totalKgCO2e || 0,
      categories: stats.map(c => ({ name: c.category, total: c.totalKgCO2e, count: c.recordCount }))
    });
    return stats;
  }, [categoryData]);
  
  const pieChartData = useMemo(
    () => {
      const total = categoryData?.totalKgCO2e || 0;
      const data = categoryStats.map((entry, index) => {
        const value = toNumberOrDefault(entry.totalKgCO2e);
        const percentage = total > 0 ? (value / toNumberOrDefault(total)) * 100 : 0;
        return {
          id: entry.category,
          label: getCategoryLabel(entry.category),
          value: value,
          percentage: percentage,
          color: COLORS[index % COLORS.length],
        };
      });
      console.log('📊 [useMemo pieChartData] Datos actualizados:', {
        totalItems: data.length,
        totalValue: total,
        calculatedTotal: data.reduce((sum, d) => sum + d.value, 0),
        items: data.map(d => ({ id: d.id, label: d.label, value: d.value, percentage: d.percentage.toFixed(2) + '%' }))
      });
      return data;
    },
    [categoryStats, categoryData, getCategoryLabel, toNumberOrDefault],
  );

  const kgValueFormatter = useCallback<ValueFormatter<number | string | null>>(
    (value) => {
      const numeric = toNumberOrDefault(value);
      return `${numeric.toFixed(2)} kg CO₂e`;
    },
    [toNumberOrDefault],
  );

  const recordValueFormatter = useCallback<ValueFormatter<number | string | null>>(
    (value) => {
      const numeric = toNumberOrDefault(value);
      return `${numeric.toFixed(0)} registros`;
    },
    [toNumberOrDefault],
  );

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
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                title={sidebarOpen ? 'Ocultar filtros' : 'Mostrar filtros'}
              >
                <span className="text-lg">{sidebarOpen ? '◀' : '▶'}</span>
                <span className="hidden sm:inline">Filtros</span>
              </button>
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
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Ocultar sidebar"
                >
                  <span className="text-xl">←</span>
                </button>
              </div>
              <div className="flex gap-2 mb-2">
                <button
                  onClick={selectAllCategories}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors shadow-sm"
                >
                  ✓ Seleccionar Todas
                </button>
                <button
                  onClick={deselectAllCategories}
                  className="flex-1 px-3 py-2 text-xs font-medium bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors shadow-sm"
                >
                  ✗ Deseleccionar
                </button>
              </div>
              <div className="mt-2">
                <button
                  onClick={() => {
                    categoriesLoadedRef.current = false;
                    loadAvailableCategories(true);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                  title="Recargar categorías desde el servidor"
                >
                  🔄 Recargar Categorías
                </button>
              </div>
              {/* Mostrar resumen filtrado dinámicamente */}
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 space-y-1">
                  <div className="flex justify-between">
                    <span>Total Registros:</span>
                    <span className="font-semibold text-gray-800">
                      {categoryData 
                        ? categoryData.categories.reduce((sum, cat) => sum + cat.recordCount, 0)
                        : summary?.totalRecords || 0}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Huella Total:</span>
                    <span className="font-semibold text-green-600">
                      {categoryData 
                        ? categoryData.totalKgCO2e.toFixed(2)
                        : summary?.totalKgCO2e.toFixed(2) || '0.00'} kg CO₂e
                    </span>
                  </div>
                  {selectedCategories.size > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="text-xs text-gray-500">
                        {selectedCategories.size} elemento{selectedCategories.size !== 1 ? 's' : ''} seleccionado{selectedCategories.size !== 1 ? 's' : ''}
                      </div>
                    </div>
                  )}
                </div>
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
                  {Object.entries(availableCategories).map(([category, subcategories]) => {
                    // Validar que subcategories sea un array
                    const validSubcategories = Array.isArray(subcategories) ? subcategories : [];
                    const hasSubcategories = validSubcategories.length > 0;
                    
                    // Log para debugging
                    console.log(`🔵 [Render Category] ${category}:`, {
                      subcategoriesType: typeof subcategories,
                      isArray: Array.isArray(subcategories),
                      validSubcategoriesCount: validSubcategories.length,
                      validSubcategories: validSubcategories,
                      hasSubcategories
                    });
                    
                    return (
                    <div
                      key={category}
                      className="border border-gray-200 rounded-lg overflow-hidden transition-all duration-200 hover:shadow-md"
                    >
                      {/* Category Header */}
                      <div
                        className="p-3 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => hasSubcategories && toggleCategoryExpansion(category)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="checkbox"
                              checked={selectedCategories.has(category)}
                              onChange={(e) => {
                                e.stopPropagation();
                                toggleCategory(category);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 transition-all cursor-pointer"
                            />
                            <span className="text-lg">{getCategoryIcon(category)}</span>
                            <span className="font-semibold text-gray-800">
                              {getCategoryLabel(category)}
                            </span>
                            {hasSubcategories && (
                              <span className="text-xs text-gray-500 ml-2">
                                ({validSubcategories.length})
                              </span>
                            )}
                          </div>
                          {hasSubcategories && (
                            <span
                              className={`text-gray-500 transition-transform duration-200 ${
                                expandedCategories.has(category) ? 'rotate-90' : ''
                              }`}
                            >
                              ▶
                            </span>
                          )}
                        </div>
                        {(() => {
                          const stats = getCategoryStats(category);
                          return stats.recordCount > 0 ? (
                            <div className="flex items-center gap-3 ml-6 text-xs">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                                {stats.recordCount} registro{stats.recordCount !== 1 ? 's' : ''}
                              </span>
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full font-medium">
                                {stats.totalKgCO2e.toFixed(2)} kg CO₂e
                              </span>
                            </div>
                          ) : null;
                        })()}
                      </div>

                      {/* Subcategories */}
                      {hasSubcategories && (
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            expandedCategories.has(category)
                              ? 'max-h-[600px] opacity-100'
                              : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="p-2 space-y-1 bg-white max-h-[600px] overflow-y-auto">
                            {validSubcategories.map((subcat, index) => {
                              if (!subcat) return null; // Saltar subcategorías nulas
                              const fullKey = `${category}_${subcat}`;
                              const isSelected = selectedCategories.has(fullKey);
                              console.log(`🔵 [Render Subcategory] ${index + 1}/${validSubcategories.length}: ${fullKey}`, { isSelected });
                              return (
                                <label
                                  key={fullKey}
                                  className={`flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all group ${
                                    isSelected
                                      ? 'bg-green-50 border border-green-200'
                                      : 'hover:bg-gray-50 border border-transparent'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleCategory(fullKey)}
                                    className="w-4 h-4 text-green-600 border-gray-300 rounded focus:ring-green-500 transition-all group-hover:scale-110 cursor-pointer"
                                  />
                                  <span className="text-sm text-gray-700 flex-1 font-medium">
                                    {category === 'transporte'
                                      ? getTransportLabel(subcat)
                                      : category === 'electricidad'
                                      ? getElectricityLabel(subcat)
                                      : subcat}
                                  </span>
                                  {isSelected && (
                                    <span className="text-green-500 text-sm font-bold">✓</span>
                                  )}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-200 bg-gradient-to-r from-green-50 to-blue-50">
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-sm font-semibold text-gray-700">
                    {selectedCategories.size}
                  </span>
                  <span className="text-xs text-gray-600">
                    elemento{selectedCategories.size !== 1 ? 's' : ''} seleccionado
                    {selectedCategories.size !== 1 ? 's' : ''}
                  </span>
                </div>
                {selectedCategories.size > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <button
                      onClick={() => {
                        const allExpanded = new Set(Object.keys(availableCategories));
                        setExpandedCategories(allExpanded);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Expandir todas
                    </button>
                    <span className="text-gray-300 mx-2">|</span>
                    <button
                      onClick={() => setExpandedCategories(new Set())}
                      className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
                    >
                      Colapsar todas
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Toggle Button when sidebar is closed */}
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="fixed left-0 top-1/2 transform -translate-y-1/2 bg-green-500 text-white px-4 py-3 rounded-r-xl shadow-xl hover:bg-green-600 transition-all z-20 flex items-center gap-2 group"
            title="Mostrar filtros de emisiones"
          >
            <span className="text-xl font-bold">→</span>
            <span className="text-sm font-medium hidden sm:inline whitespace-nowrap">
              Filtros
            </span>
            <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
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
            ) : timeSeriesPoints.length > 0 ? (
              <ResponsiveChart height={320}>
                {(width) => (
                  <LineChart
                    width={width}
                    height={320}
                    xAxis={[
                      {
                        id: 'period',
                        data: timeSeriesPoints.map((point) => point.period),
                        scaleType: 'band',
                        tickLabelStyle: {
                          angle: -45,
                          textAnchor: 'end',
                          fontSize: 12,
                          fill: '#6b7280',
                        },
                      },
                    ]}
                    yAxis={[
                      {
                        id: 'kg',
                        tickLabelStyle: { fontSize: 12, fill: '#6b7280' },
                      },
                    ]}
                    series={[
                      {
                        id: 'emisiones',
                        data: timeSeriesPoints.map((point) => toNumberOrDefault(point.totalKgCO2e)),
                        label: 'Emisiones (kg CO₂e)',
                        area: true,
                        curve: 'monotoneX',
                        color: '#10b981',
                        valueFormatter: kgValueFormatter,
                      },
                    ]}
                    margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
                    grid={{ horizontal: true, vertical: false }}
                    slotProps={{
                      tooltip: {
                        trigger: 'item',
                      },
                    }}
                  />
                )}
              </ResponsiveChart>
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
            {pieChartData.length > 0 ? (
              <ResponsiveChart height={320}>
                {(width) => (
                  <PieChart
                    width={width}
                    height={320}
                    series={[
                      {
                        data: pieChartData,
                        innerRadius: 40,
                        outerRadius: 120,
                        paddingAngle: 2,
                        cornerRadius: 4,
                        valueFormatter: (value) => {
                          const numValue = typeof value === 'number' ? value : typeof value === 'string' ? parseFloat(value) : 0;
                          return kgValueFormatter(numValue);
                        },
                        arcLabel: (item) => {
                          const dataItem = pieChartData.find((d) => d.id === item.id || d.value === item.value);
                          const percentage = dataItem?.percentage ?? 0;
                          return `${percentage.toFixed(1)}%`;
                        },
                        arcLabelMinAngle: 10,
                      },
                    ]}
                    slotProps={{
                      legend: {
                        position: { vertical: 'bottom', horizontal: 'center' },
                      },
                      tooltip: {
                        trigger: 'item',
                      },
                    }}
                  />
                )}
              </ResponsiveChart>
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
            {categoryStats.length > 0 ? (
              <ResponsiveChart height={320}>
                {(width) => (
                  <BarChart
                    width={width}
                    height={320}
                    xAxis={[
                      {
                        id: 'categories',
                        data: categoryStats.map((entry) => entry.category),
                        valueFormatter: (category: string) => getCategoryLabel(category),
                        scaleType: 'band',
                        tickLabelStyle: {
                          angle: -45,
                          textAnchor: 'end',
                          fontSize: 12,
                          fill: '#6b7280',
                        },
                      },
                    ]}
                    yAxis={[
                      {
                        id: 'kg',
                        tickLabelStyle: { fontSize: 12, fill: '#6b7280' },
                      },
                    ]}
                    series={[
                      {
                        id: 'emisiones',
                        data: categoryStats.map((entry) => toNumberOrDefault(entry.totalKgCO2e)),
                        label: 'Kg CO₂e',
                        color: '#10b981',
                        valueFormatter: kgValueFormatter,
                      },
                    ]}
                    margin={{ top: 20, right: 20, left: 10, bottom: 70 }}
                    grid={{ horizontal: true }}
                    slotProps={{
                      tooltip: { trigger: 'item' },
                    }}
                  />
                )}
              </ResponsiveChart>
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
            {categoryStats.length > 0 ? (
              <ResponsiveChart height={320}>
                {(width) => (
                  <BarChart
                    width={width}
                    height={320}
                    xAxis={[
                      {
                        id: 'categories',
                        data: categoryStats.map((entry) => entry.category),
                        valueFormatter: (category: string) => getCategoryLabel(category),
                        scaleType: 'band',
                        tickLabelStyle: {
                          angle: -45,
                          textAnchor: 'end',
                          fontSize: 12,
                          fill: '#6b7280',
                        },
                      },
                    ]}
                    yAxis={[
                      {
                        id: 'records',
                        tickLabelStyle: { fontSize: 12, fill: '#6b7280' },
                      },
                    ]}
                    series={[
                      {
                        id: 'registros',
                        data: categoryStats.map((entry) => toNumberOrDefault(entry.recordCount)),
                        label: 'Registros',
                        color: '#3b82f6',
                        valueFormatter: recordValueFormatter,
                      },
                    ]}
                    margin={{ top: 20, right: 20, left: 10, bottom: 70 }}
                    grid={{ horizontal: true }}
                    slotProps={{
                      tooltip: { trigger: 'item' },
                    }}
                  />
                )}
              </ResponsiveChart>
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
          ) : timeSeriesPoints.length > 0 ? (
            <ResponsiveChart height={400}>
              {(width) => (
                <BarChart
                  width={width}
                  height={400}
                  xAxis={[
                    {
                      id: 'period',
                      data: timeSeriesPoints.map((point) => point.period),
                      scaleType: 'band',
                      tickLabelStyle: {
                        angle: -45,
                        textAnchor: 'end',
                        fontSize: 12,
                        fill: '#6b7280',
                      },
                    },
                  ]}
                  yAxis={[
                    {
                      id: 'kg',
                      tickLabelStyle: { fontSize: 12, fill: '#6b7280' },
                    },
                  ]}
                  series={[
                    {
                      id: 'emisiones',
                      data: timeSeriesPoints.map((point) => toNumberOrDefault(point.totalKgCO2e)),
                      label: 'Kg CO₂e',
                      color: '#10b981',
                      valueFormatter: kgValueFormatter,
                    },
                  ]}
                  margin={{ top: 20, right: 20, left: 10, bottom: 80 }}
                  grid={{ horizontal: true }}
                  slotProps={{
                    tooltip: { trigger: 'item' },
                  }}
                />
              )}
            </ResponsiveChart>
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

