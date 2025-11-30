/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import { api } from '@/lib/api-client';
import type { CalcHistoryResponse, CalcHistoryItem } from '@/types/calc';

type ViewMode = 'cards' | 'table';
type SortField = 'date' | 'emission' | 'category' | 'subcategory';
type SortOrder = 'asc' | 'desc';

export default function HistoryPage() {
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<CalcHistoryResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>('');
  const [page, setPage] = useState(0);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const pageSize = 20;

  // Filtros PENDIENTES (lo que el usuario está editando)
  const [pendingSearchQuery, setPendingSearchQuery] = useState<string>('');
  const [pendingDateFrom, setPendingDateFrom] = useState<string>('');
  const [pendingDateTo, setPendingDateTo] = useState<string>('');
  const [pendingEmissionMin, setPendingEmissionMin] = useState<string>('');
  const [pendingEmissionMax, setPendingEmissionMax] = useState<string>('');
  const [pendingSelectedSubcategories, setPendingSelectedSubcategories] = useState<Set<string>>(new Set());

  // Filtros APLICADOS (los que realmente se usan para filtrar)
  const [appliedSearchQuery, setAppliedSearchQuery] = useState<string>('');
  const [appliedDateFrom, setAppliedDateFrom] = useState<string>('');
  const [appliedDateTo, setAppliedDateTo] = useState<string>('');
  const [appliedEmissionMin, setAppliedEmissionMin] = useState<string>('');
  const [appliedEmissionMax, setAppliedEmissionMax] = useState<string>('');
  const [appliedSelectedSubcategories, setAppliedSelectedSubcategories] = useState<Set<string>>(new Set());

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (category) params.append('category', category);
      params.append('page', page.toString());
      params.append('pageSize', pageSize.toString());

      // Agregar filtros aplicados al request
      if (appliedDateFrom) params.append('dateFrom', appliedDateFrom);
      if (appliedDateTo) params.append('dateTo', appliedDateTo);
      if (appliedEmissionMin) params.append('emissionMin', appliedEmissionMin);
      if (appliedEmissionMax) params.append('emissionMax', appliedEmissionMax);
      if (appliedSelectedSubcategories.size > 0) {
        appliedSelectedSubcategories.forEach(subcat => {
          params.append('subcategories', subcat);
        });
      }

      const data = await api<CalcHistoryResponse>(`/calc/history?${params.toString()}`);
      setHistory(data);
    } catch (e: any) {
      setError(e?.message || 'Error al cargar historial');
    } finally {
      setLoading(false);
    }
  }, [category, page, pageSize, appliedDateFrom, appliedDateTo, appliedEmissionMin, appliedEmissionMax, appliedSelectedSubcategories]);

  useEffect(() => {
    // ========================================================================
    // SOLUCIÓN EXPERTA: NO VALIDAR AUTH EN FRONTEND
    // ========================================================================
    // Simplemente cargar datos. Si el backend responde 401, el interceptor
    // del api-client redirigirá automáticamente.
    // Esto elimina TODOS los problemas de prefetch, CORS, y redirects prematuros.

    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, page]);

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

  const getWasteTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      organic: '🌱 Residuos Orgánicos',
      paper: '📄 Papel y Cartón',
      plastic: '🥤 Plásticos',
      glass: '🍾 Vidrio',
      metal: '🔩 Metales',
      other: '🗑️ Otros Residuos',
    };
    return labels[type] || type;
  };

  const getWasteTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      organic: '🌱',
      paper: '📄',
      plastic: '🥤',
      glass: '🍾',
      metal: '🔩',
      other: '🗑️',
    };
    return icons[type] || '♻️';
  };

  const getDisposalMethodLabel = (method: string) => {
    const labels: Record<string, string> = {
      mixed: '♻️ Gestión Mixta',
      recycling: '♻️ Reciclaje',
      composting: '🌱 Compostaje',
      landfill: '🏭 Relleno Sanitario',
    };
    return labels[method] || method;
  };

  const getDisposalMethodColor = (method: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      mixed: { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-700' },
      recycling: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
      composting: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
      landfill: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    };
    return colors[method] || colors.mixed;
  };

  const renderWasteDetails = (item: CalcHistoryItem) => {
    const input = item.input;
    const factorInfo = item.factorInfo;
    const wasteItems = input.wasteItems || [];
    const disposalMethod = input.disposalMethod || 'mixed';
    const totalWeight = wasteItems.reduce((sum, item) => sum + (item.weightKg || 0), 0);
    const disposalColors = getDisposalMethodColor(disposalMethod);

    return (
      <div className="space-y-4">
        {/* Sección: Factor de Emisión */}
        {factorInfo && factorInfo.value !== null && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">♻️</span>
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
            {totalWeight > 0 && factorInfo.value !== null && (
              <div className="mt-3 pt-3 border-t border-green-200">
                <div className="text-xs text-gray-600 mb-1">Cálculo de Emisión (Promedio)</div>
                <div className="text-sm font-mono text-gray-700">
                  {totalWeight.toFixed(2)} kg × {factorInfo.value.toFixed(6)} {factorInfo.unit || ''}
                  {' ≈ '}
                  <span className="font-bold text-green-700">{item.kgCO2e.toFixed(2)} kg CO₂e</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Sección: Resumen de Residuos */}
        <div className={`${disposalColors.bg} border ${disposalColors.border} rounded-lg p-4`}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🗑️</span>
            <h5 className="text-sm font-bold text-gray-800">Resumen de Residuos</h5>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Peso Total Semanal</div>
              <div className="text-lg font-bold text-gray-800">
                {totalWeight.toFixed(2)} kg
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Tipos de Residuos</div>
              <div className="text-lg font-bold text-gray-800">
                {wasteItems.length} {wasteItems.length === 1 ? 'tipo' : 'tipos'}
              </div>
            </div>
            <div className="bg-white/60 backdrop-blur-sm p-3 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 mb-1">Estimación Mensual</div>
              <div className="text-lg font-bold text-gray-800">
                {(totalWeight * 4.3).toFixed(1)} kg
              </div>
            </div>
          </div>

          {/* Método de Disposición */}
          <div className="pt-3 border-t border-gray-200">
            <div className="text-xs text-gray-600 mb-2">Método de Gestión</div>
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border-2 ${disposalColors.border} ${disposalColors.bg}`}>
              <span className="text-lg font-bold ${disposalColors.text}">
                {getDisposalMethodLabel(disposalMethod)}
              </span>
            </div>
          </div>
        </div>

        {/* Sección: Detalles de Cada Tipo de Residuo */}
        {wasteItems.length > 0 && (
          <div className="border-t pt-4">
            <div className="text-xs text-gray-500 mb-3 font-semibold">
              📊 Desglose por Tipo de Residuo ({wasteItems.length} {wasteItems.length === 1 ? 'tipo' : 'tipos'})
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {wasteItems.map((wasteItem, idx) => {
                const percentage = totalWeight > 0 ? (wasteItem.weightKg / totalWeight) * 100 : 0;
                return (
                  <div
                    key={idx}
                    className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getWasteTypeIcon(wasteItem.wasteType)}</span>
                        <div>
                          <div className="text-sm font-semibold text-gray-800">
                            {getWasteTypeLabel(wasteItem.wasteType)}
                          </div>
                          <div className="text-xs text-gray-600">
                            {percentage.toFixed(1)}% del total
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-700">
                          {wasteItem.weightKg.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600">kg/semana</div>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                      <div
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Sección: Detalles Generales */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-200">
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

        {/* Recomendaciones basadas en el método de disposición */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">💡</span>
            <h5 className="text-sm font-bold text-blue-800">Recomendaciones</h5>
          </div>
          <ul className="space-y-2 text-xs text-blue-900">
            {disposalMethod === 'mixed' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>Considera separar tus residuos para maximizar el reciclaje y reducir emisiones</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>El compostaje de orgánicos puede reducir emisiones en hasta un 75%</span>
                </li>
              </>
            )}
            {disposalMethod === 'landfill' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>⚠️ El relleno sanitario genera las mayores emisiones. Considera alternativas de reciclaje</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>Los residuos orgánicos en rellenos generan metano (CH₄), 25 veces más potente que CO₂</span>
                </li>
              </>
            )}
            {disposalMethod === 'recycling' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>✅ Excelente gestión. Reciclar metales ahorra -2.5 kg CO₂e por kg</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>Continúa separando correctamente tus residuos para maximizar el beneficio ambiental</span>
                </li>
              </>
            )}
            {disposalMethod === 'composting' && (
              <>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>💚 ¡Perfecto! El compostaje de orgánicos tiene beneficio neto (-0.10 kg CO₂e/kg)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex-shrink-0">•</span>
                  <span>Evita compostar residuos no orgánicos como plásticos o metales</span>
                </li>
              </>
            )}
            <li className="flex items-start gap-2">
              <span className="flex-shrink-0">•</span>
              <span>Reduce en origen: compra productos con menos empaque y prefiere reutilizables</span>
            </li>
          </ul>
        </div>
      </div>
    );
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
      case 'residuos':
        return renderWasteDetails(item);
      default:
        return (
          <div className="text-sm text-gray-600">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-3">
              <p className="text-yellow-800 text-sm mb-2">
                ⚠️ <strong>Categoría no reconocida:</strong> {item.category}
              </p>
              <p className="text-yellow-700 text-xs">
                Esta categoría aún no tiene un formato de visualización personalizado.
              </p>
            </div>
            <pre className="bg-gray-50 p-3 rounded-lg overflow-x-auto text-xs">
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

  // Función para aplicar filtros pendientes
  const applyFilters = useCallback(() => {
    setAppliedSearchQuery(pendingSearchQuery);
    setAppliedDateFrom(pendingDateFrom);
    setAppliedDateTo(pendingDateTo);
    setAppliedEmissionMin(pendingEmissionMin);
    setAppliedEmissionMax(pendingEmissionMax);
    setAppliedSelectedSubcategories(new Set(pendingSelectedSubcategories));
    setPage(0); // Reset a la primera página cuando se aplican filtros
    // Note: loadHistory se ejecutará automáticamente por el useEffect cuando cambien los filtros aplicados
  }, [pendingSearchQuery, pendingDateFrom, pendingDateTo, pendingEmissionMin, pendingEmissionMax, pendingSelectedSubcategories]);

  // Detectar si hay cambios pendientes sin aplicar
  const hasPendingChanges = useMemo(() => {
    return (
      pendingSearchQuery !== appliedSearchQuery ||
      pendingDateFrom !== appliedDateFrom ||
      pendingDateTo !== appliedDateTo ||
      pendingEmissionMin !== appliedEmissionMin ||
      pendingEmissionMax !== appliedEmissionMax ||
      pendingSelectedSubcategories.size !== appliedSelectedSubcategories.size ||
      Array.from(pendingSelectedSubcategories).some(x => !appliedSelectedSubcategories.has(x))
    );
  }, [
    pendingSearchQuery, appliedSearchQuery,
    pendingDateFrom, appliedDateFrom,
    pendingDateTo, appliedDateTo,
    pendingEmissionMin, appliedEmissionMin,
    pendingEmissionMax, appliedEmissionMax,
    pendingSelectedSubcategories, appliedSelectedSubcategories
  ]);

  // Filtrar y ordenar datos localmente
  // NOTA: Los filtros de fecha, emisiones y subcategorías ahora se aplican en el backend
  // Solo mantenemos búsqueda de texto y ordenamiento en el frontend
  const filteredAndSortedItems = useMemo(() => {
    if (!history?.items) return [];

    let filtered = [...history.items];

    // Filtro de búsqueda de texto (único filtro que queda en cliente)
    if (appliedSearchQuery.trim()) {
      const query = appliedSearchQuery.toLowerCase();
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
  }, [history, appliedSearchQuery, sortField, sortOrder]);

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
    setPendingSelectedSubcategories(prev => {
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
    // Limpiar filtros pendientes
    setPendingSearchQuery('');
    setPendingDateFrom('');
    setPendingDateTo('');
    setPendingEmissionMin('');
    setPendingEmissionMax('');
    setPendingSelectedSubcategories(new Set());
    // Limpiar filtros aplicados
    setAppliedSearchQuery('');
    setAppliedDateFrom('');
    setAppliedDateTo('');
    setAppliedEmissionMin('');
    setAppliedEmissionMax('');
    setAppliedSelectedSubcategories(new Set());
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
              <Link href="/dashboard" prefetch={false}>
                <button className="px-4 py-2 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                  Dashboard
                </button>
              </Link>
              <Link href="/analytics" prefetch={false}>
                <button className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  📊 Análisis
                </button>
              </Link>
              <button
                onClick={() => {
                  // Verificar si está usando Auth0 o JWT
                  if (auth0User) {
                    // Logout de Auth0
                    window.location.href = '/api/auth/logout';
                  } else {
                    // Logout JWT tradicional
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('username');
                    localStorage.removeItem('userId');
                    // Usar window.location.href para evitar problemas con CORS
                    window.location.href = '/login';
                  }
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
          <Link href="/dashboard" prefetch={false} className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2">
            <span>←</span> Volver al dashboard
          </Link>
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
                value={pendingSearchQuery}
                onChange={(e) => setPendingSearchQuery(e.target.value)}
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
                    value={pendingDateFrom}
                    onChange={(e) => setPendingDateFrom(e.target.value)}
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
                    value={pendingDateTo}
                    onChange={(e) => setPendingDateTo(e.target.value)}
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
                    value={pendingEmissionMin}
                    onChange={(e) => setPendingEmissionMin(e.target.value)}
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
                    value={pendingEmissionMax}
                    onChange={(e) => setPendingEmissionMax(e.target.value)}
                    placeholder="999.99"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Filtro de subcategorías */}
              {availableSubcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Subcategorías ({pendingSelectedSubcategories.size} seleccionadas)
                  </label>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 bg-gray-50 rounded-lg">
                    {availableSubcategories.map(subcat => (
                      <button
                        key={subcat}
                        onClick={() => toggleSubcategory(subcat)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          pendingSelectedSubcategories.has(subcat)
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

              {/* Botones de acción */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={clearAllFilters}
                  className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                >
                  🗑️ Limpiar Filtros
                </button>
                <button
                  onClick={applyFilters}
                  disabled={!hasPendingChanges}
                  className={`relative px-6 py-2 text-sm rounded-lg font-bold transition-all transform ${
                    hasPendingChanges
                      ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl hover:scale-105'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {hasPendingChanges && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center">
                        <span className="text-white text-xs font-bold">!</span>
                      </span>
                    </span>
                  )}
                  ✓ Aplicar Filtros
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
            <Link href="/dashboard" prefetch={false}>
              <button className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Registrar Primera Huella
              </button>
            </Link>
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
