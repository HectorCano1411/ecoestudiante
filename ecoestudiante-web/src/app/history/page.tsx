/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { CalcHistoryResponse, CalcHistoryItem } from '@/types/calc';

type ViewMode = 'cards' | 'table';
type SortField = 'date' | 'emission' | 'category' | 'subcategory';
type SortOrder = 'asc' | 'desc';

export default function HistoryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CalcHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [emissionMin, setEmissionMin] = useState<string>('');
  const [emissionMax, setEmissionMax] = useState<string>('');
  const [selectedSubcategories, setSelectedSubcategories] = useState<Set<string>>(new Set());
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const pageSize = 20;

  const loadHistory = useCallback(async () => {
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
  }, [category, page, pageSize]);

  useEffect(() => {
    // Verificar autenticación
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }
    
    loadHistory();
  }, [category, page, loadHistory, router]);

  const toggleExpand = useCallback((calcId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(calcId)) {
        newSet.delete(calcId);
      } else {
        newSet.add(calcId);
      }
      return newSet;
    });
  }, []);

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

  const getCategoryLabel = (cat: string) => {
    const labels: Record<string, string> = {
      electricidad: 'Electricidad',
      transporte: 'Transporte',
      alimentacion: 'Alimentación',
      agua: 'Agua',
      residuos: 'Residuos',
    };
    return labels[cat] || cat;
  };

  const getTransportModeLabel = (mode: string) => {
    const labels: Record<string, string> = {
      car: '🚗 Auto',
      bus: '🚌 Bus/Transporte Público',
      metro: '🚇 Metro/Tren',
      bicycle: '🚲 Bicicleta',
      walking: '🚶 Caminando',
      plane: '✈️ Avión',
      motorcycle: '🏍️ Motocicleta',
    };
    return labels[mode] || mode;
  };

  const getFuelTypeLabel = (fuel: string) => {
    const labels: Record<string, string> = {
      gasoline: '⛽ Gasolina',
      diesel: '🛢️ Diesel',
      electric: '🔌 Eléctrico',
      hybrid: '🔋 Híbrido',
    };
    return labels[fuel] || fuel;
  };

  const getApplianceIcon = (appliance: string) => {
    const icons: Record<string, string> = {
      laptop: '💻',
      desktop: '🖥️',
      tablet: '📱',
      celular: '📱',
      monitor: '🖥️',
      lampara: '💡',
      ventilador: '🌀',
      cargador: '🔌',
      router: '📡',
      impresora: '🖨️',
      altavoces: '🔊',
      microondas: '📻',
      refrigerador: '❄️',
      cafetera: '☕',
      plancha: '♨️',
      secador: '💨',
    };
    return icons[appliance] || '⚡';
  };

  const renderTransportDetails = (item: CalcHistoryItem) => {
    const input = item.input;
    const factorInfo = item.factorInfo;
    
    return (
      <div className="space-y-4">
        {/* Sección: Factor de Emisión */}
        {factorInfo && factorInfo.value !== null && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">📊</span>
              <h5 className="text-sm font-bold text-gray-800">Factor de Emisión Utilizado</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Valor del Factor</div>
                <div className="text-lg font-bold text-green-700">
                  {factorInfo.value.toFixed(6)}
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Unidad</div>
                <div className="text-sm font-semibold text-gray-800">
                  {factorInfo.unit || 'N/A'}
                </div>
              </div>
              {factorInfo.subcategory && (
                <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                  <div className="text-xs text-gray-600 mb-1">Subcategoría del Factor</div>
                  <div className="text-sm font-semibold text-gray-800 capitalize">
                    {factorInfo.subcategory.replace(/_/g, ' ')}
                  </div>
                </div>
              )}
            </div>
            {input.distance && factorInfo.value !== null && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-gray-600 mb-1">Cálculo de Emisión</div>
                <div className="text-sm font-mono text-gray-700">
                  {input.distance.toFixed(2)} km × {factorInfo.value.toFixed(6)} {factorInfo.unit || ''}
                  {input.occupancy && input.occupancy > 1 ? ` ÷ ${input.occupancy} pasajeros` : ''}
                  {' = '}
                  <span className="font-bold text-green-700">{item.kgCO2e.toFixed(2)} kg CO₂e</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Sección: Detalles del Transporte */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Modo de Transporte</div>
            <div className="font-semibold text-gray-800">
              {input.transportMode ? getTransportModeLabel(input.transportMode) : 'N/A'}
            </div>
          </div>
          
          {input.fuelType && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Tipo de Combustible</div>
              <div className="font-semibold text-gray-800">
                {getFuelTypeLabel(input.fuelType)}
              </div>
            </div>
          )}
          
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Distancia</div>
            <div className="font-semibold text-gray-800">
              {input.distance ? `${input.distance.toFixed(2)} km` : 'N/A'}
            </div>
          </div>
          
          {input.occupancy && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Ocupación</div>
              <div className="font-semibold text-gray-800">
                {input.occupancy} {input.occupancy === 1 ? 'pasajero' : 'pasajeros'}
              </div>
            </div>
          )}
          
          {input.country && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">País</div>
              <div className="font-semibold text-gray-800">{input.country}</div>
            </div>
          )}
          
          {input.period && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Período</div>
              <div className="font-semibold text-gray-800">{input.period}</div>
            </div>
          )}
        </div>
        
        {(input.originAddress || input.destinationAddress) && (
          <div className="border-t pt-3 mt-3">
            <div className="text-xs text-gray-500 mb-2 font-semibold">Ruta</div>
            <div className="space-y-2">
              {input.originAddress && (
                <div className="flex items-start gap-2">
                  <span className="text-green-600 font-bold">📍 Origen:</span>
                  <span className="text-gray-700">{input.originAddress}</span>
                  {input.originLat && input.originLng && (
                    <span className="text-xs text-gray-400">
                      ({input.originLat.toFixed(4)}, {input.originLng.toFixed(4)})
                    </span>
                  )}
                </div>
              )}
              {input.destinationAddress && (
                <div className="flex items-start gap-2">
                  <span className="text-red-600 font-bold">🎯 Destino:</span>
                  <span className="text-gray-700">{input.destinationAddress}</span>
                  {input.destinationLat && input.destinationLng && (
                    <span className="text-xs text-gray-400">
                      ({input.destinationLat.toFixed(4)}, {input.destinationLng.toFixed(4)})
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderElectricityDetails = (item: CalcHistoryItem) => {
    const input = item.input;
    const factorInfo = item.factorInfo;
    
    return (
      <div className="space-y-4">
        {/* Sección: Factor de Emisión */}
        {factorInfo && factorInfo.value !== null && (
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">⚡</span>
              <h5 className="text-sm font-bold text-gray-800">Factor de Emisión Utilizado</h5>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-blue-100">
                <div className="text-xs text-gray-600 mb-1">Valor del Factor</div>
                <div className="text-lg font-bold text-blue-700">
                  {factorInfo.value.toFixed(6)}
                </div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-blue-100">
                <div className="text-xs text-gray-600 mb-1">Unidad</div>
                <div className="text-sm font-semibold text-gray-800">
                  {factorInfo.unit || 'N/A'}
                </div>
              </div>
            </div>
            {input.kwh && factorInfo.value !== null && (
              <div className="mt-3 pt-3 border-t border-blue-200">
                <div className="text-xs text-gray-600 mb-1">Cálculo de Emisión</div>
                <div className="text-sm font-mono text-gray-700">
                  {input.kwh.toFixed(2)} kWh × {factorInfo.value.toFixed(6)} {factorInfo.unit || ''}
                  {' = '}
                  <span className="font-bold text-blue-700">{item.kgCO2e.toFixed(2)} kg CO₂e</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Sección: Detalles de Electricidad */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-xs text-gray-500 mb-1">Consumo</div>
            <div className="font-semibold text-gray-800">
              {input.kwh ? `${input.kwh.toFixed(2)} kWh` : 'N/A'}
            </div>
          </div>
          
          {input.country && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">País</div>
              <div className="font-semibold text-gray-800">{input.country}</div>
            </div>
          )}
          
          {input.period && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Período</div>
              <div className="font-semibold text-gray-800">{input.period}</div>
            </div>
          )}
          
          {input.career && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Carrera</div>
              <div className="font-semibold text-gray-800">{input.career}</div>
            </div>
          )}
          
          {input.schedule && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Jornada</div>
              <div className="font-semibold text-gray-800 capitalize">{input.schedule}</div>
            </div>
          )}
        </div>
        
        {input.selectedAppliances && input.selectedAppliances.length > 0 && (
          <div className="border-t pt-3 mt-3">
            <div className="text-xs text-gray-500 mb-2 font-semibold">Electrodomésticos ({input.selectedAppliances.length})</div>
            <div className="flex flex-wrap gap-2">
              {input.selectedAppliances.map((appliance, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
                >
                  <span>{getApplianceIcon(appliance)}</span>
                  <span className="capitalize">{appliance}</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDetails = (item: CalcHistoryItem) => {
    switch (item.category) {
      case 'transporte':
        return renderTransportDetails(item);
      case 'electricidad':
        return renderElectricityDetails(item);
      default:
        return (
          <div className="text-sm text-gray-600">
            <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto">
              {JSON.stringify(item.input, null, 2)}
            </pre>
          </div>
        );
    }
  };

  // Obtener todas las subcategorías únicas para el filtro
  const availableSubcategories = useMemo(() => {
    if (!history?.items) return [];
    const subcats = new Set<string>();
    history.items.forEach(item => {
      if (item.subcategory) {
        subcats.add(item.subcategory);
      }
    });
    return Array.from(subcats).sort();
  }, [history]);

  // Filtrar y ordenar datos localmente
  const filteredAndSortedItems = useMemo(() => {
    if (!history?.items) return [];

    let filtered = [...history.items];

    // Filtro de búsqueda de texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => {
        const searchableText = [
          item.category,
          item.subcategory,
          item.calcId,
          formatDate(item.createdAt),
          item.kgCO2e.toString(),
          JSON.stringify(item.input)
        ].join(' ').toLowerCase();
        return searchableText.includes(query);
      });
    }

    // Filtro por rango de fechas
    if (dateFrom) {
      const fromDate = new Date(dateFrom);
      filtered = filtered.filter(item => new Date(item.createdAt) >= fromDate);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999); // Incluir todo el día
      filtered = filtered.filter(item => new Date(item.createdAt) <= toDate);
    }

    // Filtro por rango de emisiones
    if (emissionMin) {
      const min = parseFloat(emissionMin);
      if (!isNaN(min)) {
        filtered = filtered.filter(item => item.kgCO2e >= min);
      }
    }
    if (emissionMax) {
      const max = parseFloat(emissionMax);
      if (!isNaN(max)) {
        filtered = filtered.filter(item => item.kgCO2e <= max);
      }
    }

    // Filtro por subcategorías seleccionadas
    if (selectedSubcategories.size > 0) {
      filtered = filtered.filter(item => 
        item.subcategory && selectedSubcategories.has(item.subcategory)
      );
    }

    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortField) {
        case 'date':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'emission':
          aValue = a.kgCO2e;
          bValue = b.kgCO2e;
          break;
        case 'category':
          aValue = a.category;
          bValue = b.category;
          break;
        case 'subcategory':
          aValue = a.subcategory || '';
          bValue = b.subcategory || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [history, searchQuery, dateFrom, dateTo, emissionMin, emissionMax, selectedSubcategories, sortField, sortOrder]);

  // Calcular estadísticas del conjunto filtrado
  const filteredStats = useMemo(() => {
    if (filteredAndSortedItems.length === 0) {
      return {
        total: 0,
        average: 0,
        min: 0,
        max: 0,
        totalEmissions: 0
      };
    }

    const emissions = filteredAndSortedItems.map(item => item.kgCO2e);
    const totalEmissions = emissions.reduce((sum, val) => sum + val, 0);
    const average = totalEmissions / emissions.length;
    const min = Math.min(...emissions);
    const max = Math.max(...emissions);

    return {
      total: filteredAndSortedItems.length,
      average,
      min,
      max,
      totalEmissions
    };
  }, [filteredAndSortedItems]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSubcategory = (subcat: string) => {
    setSelectedSubcategories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subcat)) {
        newSet.delete(subcat);
      } else {
        newSet.add(subcat);
      }
      return newSet;
    });
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setEmissionMin('');
    setEmissionMax('');
    setSelectedSubcategories(new Set());
    setCategory('');
    setPage(0);
  };

  const totalPages = history ? Math.ceil(history.total / pageSize) : 0;

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
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Dashboard
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                📊 Análisis
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
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Historial Detallado de Registros</h2>
          <p className="text-gray-600">
            Revisa todos los detalles de tus registros de huella de carbono organizados por categoría y subcategoría
          </p>
        </div>

        {/* Panel de Filtros Avanzados */}
        <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          {/* Barra de búsqueda y controles principales */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                🔍 Búsqueda de texto
              </label>
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar en todos los campos..."
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                id="category"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(0);
                  setExpandedItems(new Set());
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
            <div className="flex items-end gap-2">
              <button
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showAdvancedFilters ? '▲' : '▼'} Filtros Avanzados
              </button>
              <button
                onClick={() => setViewMode(viewMode === 'cards' ? 'table' : 'cards')}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                {viewMode === 'cards' ? '📊 Tabla' : '🃏 Cards'}
              </button>
            </div>
          </div>

          {/* Filtros avanzados (colapsables) */}
          {showAdvancedFilters && (
            <div className="border-t pt-4 mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label htmlFor="dateFrom" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha desde
                  </label>
                  <input
                    id="dateFrom"
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="dateTo" className="block text-sm font-medium text-gray-700 mb-2">
                    Fecha hasta
                  </label>
                  <input
                    id="dateTo"
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="emissionMin" className="block text-sm font-medium text-gray-700 mb-2">
                    Emisión mín. (kg CO₂e)
                  </label>
                  <input
                    id="emissionMin"
                    type="number"
                    step="0.01"
                    value={emissionMin}
                    onChange={(e) => setEmissionMin(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label htmlFor="emissionMax" className="block text-sm font-medium text-gray-700 mb-2">
                    Emisión máx. (kg CO₂e)
                  </label>
                  <input
                    id="emissionMax"
                    type="number"
                    step="0.01"
                    value={emissionMax}
                    onChange={(e) => setEmissionMax(e.target.value)}
                    placeholder="999.99"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Filtro de subcategorías */}
              {availableSubcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategorías ({selectedSubcategories.size} seleccionadas)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                    {availableSubcategories.map(subcat => (
                      <button
                        key={subcat}
                        onClick={() => toggleSubcategory(subcat)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          selectedSubcategories.has(subcat)
                            ? 'bg-green-500 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-100'
                        }`}
                      >
                        {subcat}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón limpiar filtros */}
              <div className="flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                  🗑️ Limpiar Todos los Filtros
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Resumen Estadístico */}
        {filteredStats.total > 0 && (
          <div className="mb-6 bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-3">📊 Resumen de Registros Filtrados</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Total Registros</div>
                <div className="text-lg font-bold text-gray-800">{filteredStats.total}</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Total Emisiones</div>
                <div className="text-lg font-bold text-green-700">{filteredStats.totalEmissions.toFixed(2)} kg CO₂e</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Promedio</div>
                <div className="text-lg font-bold text-blue-700">{filteredStats.average.toFixed(2)} kg CO₂e</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Mínimo</div>
                <div className="text-lg font-bold text-gray-700">{filteredStats.min.toFixed(2)} kg CO₂e</div>
              </div>
              <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-green-100">
                <div className="text-xs text-gray-600 mb-1">Máximo</div>
                <div className="text-lg font-bold text-red-700">{filteredStats.max.toFixed(2)} kg CO₂e</div>
              </div>
            </div>
          </div>
        )}

        {/* Contenido */}
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando historial...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 shadow-sm">
            <p className="text-red-800">{error}</p>
          </div>
        ) : !history || history.items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
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
            <div className="mb-6 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <p className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-gray-800">{filteredAndSortedItems.length}</span> de{' '}
                <span className="font-semibold text-gray-800">{history.total}</span> registros
                {filteredAndSortedItems.length !== history.items.length && (
                  <span className="ml-2 text-blue-600">
                    (filtrados de {history.items.length} registros cargados)
                  </span>
                )}
              </p>
            </div>

            {/* Vista de Tabla */}
            {viewMode === 'table' && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('date')}
                        >
                          <div className="flex items-center gap-2">
                            Fecha
                            {sortField === 'date' && (
                              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('category')}
                        >
                          <div className="flex items-center gap-2">
                            Categoría
                            {sortField === 'category' && (
                              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('subcategory')}
                        >
                          <div className="flex items-center gap-2">
                            Subcategoría
                            {sortField === 'subcategory' && (
                              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                          onClick={() => handleSort('emission')}
                        >
                          <div className="flex items-center gap-2">
                            Emisión (kg CO₂e)
                            {sortField === 'emission' && (
                              <span>{sortOrder === 'asc' ? '↑' : '↓'}</span>
                            )}
                          </div>
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Factor
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {filteredAndSortedItems.map((item: CalcHistoryItem) => {
                        const isExpanded = expandedItems.has(item.calcId);
                        return (
                          <React.Fragment key={item.calcId}>
                            <tr
                              className="hover:bg-gray-50 transition-colors cursor-pointer"
                              onClick={() => toggleExpand(item.calcId)}
                            >
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                {formatDate(item.createdAt)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="text-lg">{getCategoryIcon(item.category)}</span>
                                  <span className="text-sm font-medium text-gray-800">
                                    {getCategoryLabel(item.category)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {item.subcategory ? (
                                  <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                    {item.subcategory}
                                  </span>
                                ) : (
                                  <span className="text-sm text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="text-sm font-bold text-green-600">
                                  {item.kgCO2e.toFixed(2)}
                                </span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {item.factorInfo?.value ? (
                                  <span>
                                    {item.factorInfo.value.toFixed(6)} {item.factorInfo.unit || ''}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleExpand(item.calcId);
                                  }}
                                  className="text-blue-600 hover:text-blue-800"
                                >
                                  {isExpanded ? 'Ocultar' : 'Ver'} detalles
                                </button>
                              </td>
                            </tr>
                            {isExpanded && (
                              <tr>
                                <td colSpan={6} className="px-4 py-4 bg-gray-50">
                                  <div className="max-w-4xl">
                                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Detalles Completos</h5>
                                    {renderDetails(item)}
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {filteredAndSortedItems.length === 0 && (
                  <div className="p-12 text-center text-gray-500">
                    No hay registros que coincidan con los filtros aplicados
                  </div>
                )}
              </div>
            )}

            {/* Vista de Cards */}
            {viewMode === 'cards' && (
              <div className="space-y-4">
                {filteredAndSortedItems.map((item: CalcHistoryItem) => {
                const isExpanded = expandedItems.has(item.calcId);
                return (
                  <div
                    key={item.calcId}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
                  >
                    {/* Header del card */}
                    <div
                      className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => toggleExpand(item.calcId)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="text-3xl">{getCategoryIcon(item.category)}</div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <h3 className="text-lg font-semibold text-gray-800">
                                {getCategoryLabel(item.category)}
                              </h3>
                              {item.subcategory && (
                                <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded-full">
                                  {item.subcategory}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-500">
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="text-2xl font-bold text-green-600">
                              {item.kgCO2e.toFixed(2)}
                            </div>
                            <div className="text-xs text-gray-500">kg CO₂e</div>
                          </div>
                          <button className="text-gray-400 hover:text-gray-600 transition-colors">
                            <svg
                              className={`w-6 h-6 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contenido expandible */}
                    {isExpanded && (
                      <div className="border-t border-gray-200 p-4 bg-gray-50">
                        <div className="mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <span>📋</span>
                            <span>Detalles Completos de la Medición</span>
                          </h4>
                          {renderDetails(item)}
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-300">
                          <div className="flex items-center justify-between">
                            <div className="text-xs text-gray-500">
                              <strong>ID del Registro:</strong> <span className="font-mono text-gray-600">{item.calcId}</span>
                            </div>
                            {item.factorInfo && item.factorInfo.value !== null && (
                              <div className="text-xs text-gray-500">
                                <span className="text-gray-400">Factor aplicado:</span>{' '}
                                <span className="font-semibold text-gray-700">
                                  {item.factorInfo.value.toFixed(6)} {item.factorInfo.unit || ''}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              </div>
            )}

            {filteredAndSortedItems.length === 0 && viewMode === 'cards' && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">No hay resultados</h3>
                <p className="text-gray-600 mb-6">
                  No se encontraron registros que coincidan con los filtros aplicados
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Limpiar Filtros
                </button>
              </div>
            )}

            {/* Paginación */}
            {totalPages > 1 && (
              <div className="mt-6 bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Página <span className="font-semibold">{page + 1}</span> de{' '}
                    <span className="font-semibold">{totalPages}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setPage(Math.max(0, page - 1));
                        setExpandedItems(new Set());
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page === 0}
                      className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() => {
                        setPage(Math.min(totalPages - 1, page + 1));
                        setExpandedItems(new Set());
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      disabled={page >= totalPages - 1}
                      className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
