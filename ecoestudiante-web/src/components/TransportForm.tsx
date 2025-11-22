/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '@/lib/api-client';
import MobilityMap, { Location } from '@/components/MobilityMap';
import type { TransportInput, CalcResult } from '@/types/calc';

// Factores de emisión para cálculo rápido (previsualización)
const EMISSION_FACTORS: Record<string, number> = {
  'car_gasoline': 0.120,
  'car_diesel': 0.130,
  'car_electric': 0.050,
  'car_hybrid': 0.080,
  'motorcycle_gasoline': 0.113,
  'bus': 0.089,
  'metro': 0.014,
  'bicycle': 0.000,
  'walking': 0.000,
  'plane': 0.255,
};

// Configuración de modos de transporte con información adicional
const TRANSPORT_MODES = [
  { 
    key: 'walking', 
    name: 'Caminando', 
    icon: '🚶', 
    factor: EMISSION_FACTORS.walking,
    category: 'sustainable',
    description: '0 emisiones, ejercicio saludable'
  },
  { 
    key: 'bicycle', 
    name: 'Bicicleta', 
    icon: '🚲', 
    factor: EMISSION_FACTORS.bicycle,
    category: 'sustainable',
    description: '0 emisiones directas, sostenible'
  },
  { 
    key: 'metro', 
    name: 'Metro/Tren', 
    icon: '🚇', 
    factor: EMISSION_FACTORS.metro,
    category: 'sustainable',
    description: 'Bajo impacto, transporte público'
  },
  { 
    key: 'bus', 
    name: 'Bus', 
    icon: '🚌', 
    factor: EMISSION_FACTORS.bus,
    category: 'moderate',
    description: 'Transporte público, emisiones moderadas'
  },
  { 
    key: 'car_electric', 
    name: 'Auto Eléctrico', 
    icon: '🔌', 
    factor: EMISSION_FACTORS.car_electric,
    category: 'moderate',
    description: 'Bajas emisiones, movilidad privada'
  },
  { 
    key: 'car_hybrid', 
    name: 'Auto Híbrido', 
    icon: '🔋', 
    factor: EMISSION_FACTORS.car_hybrid,
    category: 'moderate',
    description: 'Emisiones moderadas, eficiente'
  },
  { 
    key: 'car_gasoline', 
    name: 'Auto Gasolina', 
    icon: '🚗', 
    factor: EMISSION_FACTORS.car_gasoline,
    category: 'high',
    description: 'Alto impacto ambiental'
  },
  { 
    key: 'car_diesel', 
    name: 'Auto Diésel', 
    icon: '🚗', 
    factor: EMISSION_FACTORS.car_diesel,
    category: 'high',
    description: 'Alto impacto ambiental'
  },
  { 
    key: 'motorcycle_gasoline', 
    name: 'Motocicleta', 
    icon: '🏍️', 
    factor: EMISSION_FACTORS.motorcycle_gasoline,
    category: 'high',
    description: 'Alto impacto por km'
  },
  { 
    key: 'plane', 
    name: 'Avión', 
    icon: '✈️', 
    factor: EMISSION_FACTORS.plane,
    category: 'very_high',
    description: 'Muy alto impacto ambiental'
  },
];

interface EmissionOption {
  key: string;
  name: string;
  icon: string;
  emissions: number;
  category: 'sustainable' | 'moderate' | 'high' | 'very_high';
  description: string;
  factor: number;
}

export default function TransportForm({ onSuccess }: { onSuccess?: () => void }) {
  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [loading, setLoading] = useState(false);
  const [transportMode, setTransportMode] = useState<TransportInput['transportMode']>('car');
  const [fuelType, setFuelType] = useState<'gasoline' | 'diesel' | 'electric' | 'hybrid'>('gasoline');
  const [occupancy, setOccupancy] = useState<string>('1');
  const [distance, setDistance] = useState<string>('');
  const [country, setCountry] = useState<string>('CL');
  const [period, setPeriod] = useState<string>(getCurrentPeriod());
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Ubicaciones del mapa
  const [origin, setOrigin] = useState<Location | null>(null);
  const [destination, setDestination] = useState<Location | null>(null);
  const [mapDistance, setMapDistance] = useState<number | null>(null);

  const countries = [
    { code: 'CL', name: 'Chile' },
    { code: 'AR', name: 'Argentina' },
    { code: 'BR', name: 'Brasil' },
    { code: 'CO', name: 'Colombia' },
    { code: 'MX', name: 'México' },
    { code: 'PE', name: 'Perú' },
    { code: 'ES', name: 'España' },
    { code: 'US', name: 'Estados Unidos' },
  ];

  // Calcular emisiones automáticamente cuando cambia la distancia
  const emissionOptions: EmissionOption[] = useMemo(() => {
    if (!mapDistance || mapDistance <= 0) return [];

    const occupancyNum = parseInt(occupancy) || 1;
    
    return TRANSPORT_MODES.map(mode => {
      // Para autos, usar el factor según el tipo de combustible seleccionado
      let factor = mode.factor;
      if (mode.key.startsWith('car_')) {
        // Si el modo seleccionado es 'car', usar el fuelType seleccionado
        if (transportMode === 'car') {
          const carKey = `car_${fuelType}`;
          factor = EMISSION_FACTORS[carKey] || mode.factor;
        }
      }

      // Calcular emisiones base
      let baseEmissions = mapDistance * factor;
      
      // Ajustar por ocupación solo para autos y bus
      if (['car_gasoline', 'car_diesel', 'car_electric', 'car_hybrid', 'bus'].includes(mode.key)) {
        if (mode.key === 'bus') {
          // Bus siempre usa ocupación 1 para el preview
          baseEmissions = baseEmissions / 1;
        } else {
          // Autos usan la ocupación seleccionada
          baseEmissions = baseEmissions / occupancyNum;
        }
      }

      return {
        ...mode,
        emissions: baseEmissions,
      };
    }).sort((a, b) => a.emissions - b.emissions); // Ordenar de menor a mayor emisión
  }, [mapDistance, occupancy, transportMode, fuelType]);

  // Obtener opciones más sustentables (top 3)
  const sustainableOptions = useMemo(() => {
    return emissionOptions
      .filter(opt => opt.category === 'sustainable' || opt.category === 'moderate')
      .slice(0, 3);
  }, [emissionOptions]);

  // Obtener opciones más contaminantes (bottom 3)
  const highEmissionOptions = useMemo(() => {
    return emissionOptions
      .filter(opt => opt.category === 'high' || opt.category === 'very_high')
      .slice(-3)
      .reverse();
  }, [emissionOptions]);

  // Actualizar distancia cuando el mapa calcula una ruta
  useEffect(() => {
    if (mapDistance !== null) {
      setDistance(mapDistance.toFixed(2));
    }
  }, [mapDistance]);

  // Obtener emisión actual según modo seleccionado
  const getCurrentEmission = (): number | null => {
    if (!mapDistance || mapDistance <= 0) return null;

    let key = '';
    if (transportMode === 'car') {
      key = `car_${fuelType}`;
    } else if (transportMode === 'motorcycle') {
      key = 'motorcycle_gasoline';
    } else {
      key = transportMode;
    }

    const factor = EMISSION_FACTORS[key] || 0;
    const occupancyNum = ['car', 'bus'].includes(transportMode) ? (parseInt(occupancy) || 1) : 1;
    return (mapDistance * factor) / occupancyNum;
  };

  // Seleccionar modo desde la previsualización
  const handleSelectMode = (option: EmissionOption) => {
    if (option.key === 'walking') {
      setTransportMode('walking');
    } else if (option.key === 'bicycle') {
      setTransportMode('bicycle');
    } else if (option.key === 'metro') {
      setTransportMode('metro');
    } else if (option.key === 'bus') {
      setTransportMode('bus');
    } else if (option.key === 'plane') {
      setTransportMode('plane');
    } else if (option.key === 'motorcycle_gasoline') {
      setTransportMode('motorcycle');
    } else if (option.key.startsWith('car_')) {
      setTransportMode('car');
      const fuel = option.key.replace('car_', '') as typeof fuelType;
      setFuelType(fuel);
    }
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        throw new Error('Usuario no autenticado');
      }

      const distanceValue = parseFloat(distance);
      if (isNaN(distanceValue) || distanceValue <= 0) {
        throw new Error('La distancia debe ser un número mayor a 0');
      }

      const payload: TransportInput = {
        distance: distanceValue,
        transportMode,
        fuelType: ['car', 'motorcycle'].includes(transportMode) ? fuelType : undefined,
        occupancy: ['car', 'bus'].includes(transportMode) ? parseInt(occupancy) : undefined,
        country,
        period,
        idempotencyKey: `transport-${Date.now()}`,
        userId,
        originLat: origin?.lat,
        originLng: origin?.lng,
        destinationLat: destination?.lat,
        destinationLng: destination?.lng,
        originAddress: origin?.address,
        destinationAddress: destination?.address,
      };

      const res = await api<CalcResult>('/calc/transport', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);
      setSuccess(true);
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Limpiar formulario después de éxito
      setTimeout(() => {
        setDistance('');
        setOrigin(null);
        setDestination(null);
        setMapDistance(null);
        setSuccess(false);
        setResult(null);
      }, 5000);
    } catch (e: any) {
      const errorMessage = e?.message || 'Error al calcular la huella de carbono';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  const requiresFuelType = ['car', 'motorcycle'].includes(transportMode);
  const requiresOccupancy = ['car', 'bus'].includes(transportMode);

  // Función para obtener badge de categoría
  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'sustainable':
        return { text: '🌱 Sostenible', color: 'bg-green-500' };
      case 'moderate':
        return { text: '⚠️ Moderado', color: 'bg-yellow-500' };
      case 'high':
        return { text: '🔴 Alto', color: 'bg-orange-500' };
      case 'very_high':
        return { text: '🚨 Muy Alto', color: 'bg-red-500' };
      default:
        return { text: '', color: '' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Mapa para seleccionar origen y destino */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          🗺️ Selecciona Origen y Destino en el Mapa
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Haz clic en el mapa para establecer el punto de partida, luego haz clic nuevamente para establecer el destino.
          El sistema calculará automáticamente la distancia y las emisiones de carbono.
        </p>
        <MobilityMap
          onOriginChange={setOrigin}
          onDestinationChange={setDestination}
          onDistanceChange={setMapDistance}
        />
        
        {/* Previsualización automática de emisiones - Opciones más sustentables */}
        {emissionOptions.length > 0 && mapDistance && (
          <div className="mt-6 space-y-4">
            {/* Opciones más sustentables */}
            <div className="p-5 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-300 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">🌱</span>
                <h4 className="text-lg font-bold text-green-800">
                  Opciones Más Sostenibles
                </h4>
              </div>
              <p className="text-sm text-green-700 mb-4">
                Estas opciones tienen el menor impacto ambiental para tu recorrido de <strong>{mapDistance.toFixed(2)} km</strong>
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {sustainableOptions.map((option) => {
                  const badge = getCategoryBadge(option.category);
                  const isSelected = 
                    (transportMode === 'walking' && option.key === 'walking') ||
                    (transportMode === 'bicycle' && option.key === 'bicycle') ||
                    (transportMode === 'metro' && option.key === 'metro') ||
                    (transportMode === 'bus' && option.key === 'bus') ||
                    (transportMode === 'car' && option.key === `car_${fuelType}`);
                  
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleSelectMode(option)}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all text-left
                        ${isSelected 
                          ? 'bg-green-200 border-green-500 shadow-md scale-105' 
                          : 'bg-white border-green-200 hover:border-green-400 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{option.icon}</span>
                        {badge.text && (
                          <span className={`text-xs px-2 py-1 rounded-full text-white ${badge.color}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-800 mb-1">{option.name}</div>
                      <div className="text-2xl font-bold text-green-600 mb-1">
                        {option.emissions.toFixed(2)} kg CO₂e
                      </div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <span className="text-green-600 text-xl">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opciones más contaminantes */}
            <div className="p-5 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-300 shadow-lg">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">⚠️</span>
                <h4 className="text-lg font-bold text-red-800">
                  Opciones con Mayor Impacto Ambiental
                </h4>
              </div>
              <p className="text-sm text-red-700 mb-4">
                Estas opciones generan más emisiones de carbono. Considera alternativas más sostenibles cuando sea posible.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {highEmissionOptions.map((option) => {
                  const badge = getCategoryBadge(option.category);
                  const isSelected = 
                    (transportMode === 'car' && option.key === `car_${fuelType}`) ||
                    (transportMode === 'motorcycle' && option.key === 'motorcycle_gasoline') ||
                    (transportMode === 'plane' && option.key === 'plane');
                  
                  return (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => handleSelectMode(option)}
                      className={`
                        relative p-4 rounded-lg border-2 transition-all text-left
                        ${isSelected 
                          ? 'bg-red-200 border-red-500 shadow-md scale-105' 
                          : 'bg-white border-red-200 hover:border-red-400 hover:shadow-md'
                        }
                      `}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{option.icon}</span>
                        {badge.text && (
                          <span className={`text-xs px-2 py-1 rounded-full text-white ${badge.color}`}>
                            {badge.text}
                          </span>
                        )}
                      </div>
                      <div className="font-semibold text-gray-800 mb-1">{option.name}</div>
                      <div className="text-2xl font-bold text-red-600 mb-1">
                        {option.emissions.toFixed(2)} kg CO₂e
                      </div>
                      <div className="text-xs text-gray-600">{option.description}</div>
                      {isSelected && (
                        <div className="absolute top-2 right-2">
                          <span className="text-red-600 text-xl">✓</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comparación visual */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h5 className="text-sm font-semibold text-blue-900 mb-2">
                📊 Comparación de Impacto
              </h5>
              <div className="space-y-2">
                {emissionOptions.length > 0 && (
                  <>
                    <div className="text-xs text-gray-700">
                      <strong>Menor emisión:</strong> {sustainableOptions[0]?.name} ({sustainableOptions[0]?.emissions.toFixed(2)} kg CO₂e)
                    </div>
                    <div className="text-xs text-gray-700">
                      <strong>Mayor emisión:</strong> {highEmissionOptions[0]?.name} ({highEmissionOptions[0]?.emissions.toFixed(2)} kg CO₂e)
                    </div>
                    {highEmissionOptions[0] && sustainableOptions[0] && (
                      <div className="text-xs font-semibold text-blue-700">
                        💡 {highEmissionOptions[0].name} genera{' '}
                        <strong>
                          {((highEmissionOptions[0].emissions / sustainableOptions[0].emissions - 1) * 100).toFixed(0)}%
                        </strong>{' '}
                        más emisiones que {sustainableOptions[0].name}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Emisión actual seleccionada */}
            {getCurrentEmission() !== null && (
              <div className="p-4 bg-gradient-to-r from-blue-100 to-green-100 rounded-lg border-2 border-blue-300">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">
                      Emisión estimada con tu selección actual:
                    </span>
                    <p className="text-xs text-gray-600 mt-1">
                      {transportMode === 'car' && `Auto ${fuelType === 'gasoline' ? 'Gasolina' : fuelType === 'diesel' ? 'Diésel' : fuelType === 'electric' ? 'Eléctrico' : 'Híbrido'}`}
                      {transportMode === 'bus' && 'Bus'}
                      {transportMode === 'metro' && 'Metro/Tren'}
                      {transportMode === 'bicycle' && 'Bicicleta'}
                      {transportMode === 'walking' && 'Caminando'}
                      {transportMode === 'motorcycle' && 'Motocicleta'}
                      {transportMode === 'plane' && 'Avión'}
                      {['car', 'bus'].includes(transportMode) && parseInt(occupancy) > 1 && ` • ${occupancy} pasajeros`}
                    </p>
                  </div>
                  <span className="text-3xl font-bold text-blue-700">
                    {getCurrentEmission()!.toFixed(2)} kg CO₂e
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Modo de Transporte */}
        <div>
          <label htmlFor="transportMode" className="block text-sm font-medium text-gray-700 mb-2">
            Modo de Transporte
          </label>
          <select
            id="transportMode"
            value={transportMode}
            onChange={(e) => setTransportMode(e.target.value as TransportInput['transportMode'])}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            <option value="car">🚗 Auto</option>
            <option value="bus">🚌 Bus/Transporte Público</option>
            <option value="metro">🚇 Metro/Tren</option>
            <option value="motorcycle">🏍️ Motocicleta</option>
            <option value="bicycle">🚲 Bicicleta</option>
            <option value="walking">🚶 Caminando</option>
            <option value="plane">✈️ Avión</option>
          </select>
          {mapDistance && getCurrentEmission() !== null && (
            <p className="mt-1 text-xs text-blue-600">
              💡 Emisión estimada: {getCurrentEmission()!.toFixed(2)} kg CO₂e
            </p>
          )}
        </div>

        {/* Tipo de Combustible (solo para car/motorcycle) */}
        {requiresFuelType && (
          <div>
            <label htmlFor="fuelType" className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Combustible
            </label>
            <select
              id="fuelType"
              value={fuelType}
              onChange={(e) => setFuelType(e.target.value as typeof fuelType)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              <option value="gasoline">⛽ Gasolina</option>
              <option value="diesel">🛢️ Diésel</option>
              <option value="electric">🔌 Eléctrico (Más Sostenible)</option>
              <option value="hybrid">🔋 Híbrido</option>
            </select>
            {mapDistance && (
              <p className="mt-1 text-xs text-gray-600">
                {fuelType === 'electric' && '✅ Excelente opción sostenible'}
                {fuelType === 'hybrid' && '✅ Buena opción sostenible'}
                {fuelType === 'gasoline' && '⚠️ Considera opciones más sostenibles'}
                {fuelType === 'diesel' && '⚠️ Alto impacto ambiental'}
              </p>
            )}
          </div>
        )}

        {/* Ocupación (solo para car/bus) */}
        {requiresOccupancy && (
          <div>
            <label htmlFor="occupancy" className="block text-sm font-medium text-gray-700 mb-2">
              Número de Pasajeros
            </label>
            <input
              id="occupancy"
              type="number"
              min="1"
              max="50"
              value={occupancy}
              onChange={(e) => setOccupancy(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
            <p className="mt-1 text-xs text-gray-500">
              Incluye al conductor. La emisión se divide entre todos los pasajeros.
              {mapDistance && parseInt(occupancy) > 1 && (
                <span className="text-green-600"> • A mayor ocupación, menor emisión por persona.</span>
              )}
            </p>
          </div>
        )}

        {/* Distancia */}
        <div>
          <label htmlFor="distance" className="block text-sm font-medium text-gray-700 mb-2">
            Distancia (km) {mapDistance && <span className="text-green-600 font-semibold">✓ Calculada automáticamente</span>}
          </label>
          <input
            id="distance"
            type="number"
            step="0.01"
            min="0"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder={mapDistance ? mapDistance.toFixed(2) : "Ej: 15.5"}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
          {mapDistance && (
            <p className="mt-1 text-xs text-green-600">
              ✓ Distancia calculada del mapa: {mapDistance.toFixed(2)} km
            </p>
          )}
          {!mapDistance && (
            <p className="mt-1 text-xs text-gray-500">
              💡 Selecciona origen y destino en el mapa para calcular automáticamente, o ingresa la distancia manualmente
            </p>
          )}
        </div>

        {/* País */}
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
            País
          </label>
          <select
            id="country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Período */}
        <div>
          <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
            Período (YYYY-MM)
          </label>
          <input
            id="period"
            type="month"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
            required
          />
        </div>

        {/* Mensajes de Error/Success */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {success && result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800 mb-2">
              ✅ Cálculo realizado exitosamente
            </p>
            <div className="text-sm text-green-700 space-y-1">
              <p><strong>Huella de Carbono:</strong> {result.kgCO2e.toFixed(2)} kg CO₂e</p>
              <p><strong>ID del Cálculo:</strong> {result.calcId}</p>
            </div>
          </div>
        )}

        {/* Botón Submit */}
        <button
          type="submit"
          disabled={loading || !distance || parseFloat(distance) <= 0}
          className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculando...
            </span>
          ) : (
            '💾 Guardar Cálculo de Huella de Carbono'
          )}
        </button>
      </form>
    </div>
  );
}
