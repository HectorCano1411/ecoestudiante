/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { api } from '@/lib/api-client';
import type { ElectricityInput, CalcResult } from '@/types/calc';
import ResultModal, { type ImpactLevel } from '@/components/ResultModal';

// Artefactos eléctricos comunes para estudiantes universitarios
// Factores de emisión en kg CO2e por kWh mensual (promedio de uso típico)
interface Appliance {
  id: string;
  name: string;
  icon: string;
  description: string;
  monthlyKwh: number; // Consumo mensual promedio en kWh
  category: 'sustainable' | 'moderate' | 'high'; // Clasificación de impacto
  tips?: string; // Tips para reducir consumo
}

const APPLIANCES: Appliance[] = [
  {
    id: 'laptop',
    name: 'Laptop',
    icon: '💻',
    description: 'Computadora portátil (uso diario 6-8 horas)',
    monthlyKwh: 15,
    category: 'moderate',
    tips: 'Usa modo ahorro de energía y desconecta cuando no uses'
  },
  {
    id: 'desktop',
    name: 'PC Escritorio',
    icon: '🖥️',
    description: 'Computadora de escritorio (uso diario 4-6 horas)',
    monthlyKwh: 30,
    category: 'high',
    tips: 'Apaga completamente cuando no uses, considera modo suspensión'
  },
  {
    id: 'tablet',
    name: 'Tablet',
    icon: '📱',
    description: 'Tablet para estudio y entretenimiento',
    monthlyKwh: 3,
    category: 'sustainable',
    tips: 'Baja el brillo y cierra apps en segundo plano'
  },
  {
    id: 'celular',
    name: 'Celular',
    icon: '📱',
    description: 'Teléfono móvil (carga diaria)',
    monthlyKwh: 1.5,
    category: 'sustainable',
    tips: 'Usa carga rápida solo cuando sea necesario'
  },
  {
    id: 'monitor',
    name: 'Monitor',
    icon: '🖥️',
    description: 'Monitor externo (uso diario 6-8 horas)',
    monthlyKwh: 12,
    category: 'moderate',
    tips: 'Ajusta brillo automático y apaga cuando no uses'
  },
  {
    id: 'lampara',
    name: 'Lámpara LED',
    icon: '💡',
    description: 'Lámpara de escritorio LED (uso diario 4-6 horas)',
    monthlyKwh: 2,
    category: 'sustainable',
    tips: 'Usa bombillas LED de bajo consumo'
  },
  {
    id: 'ventilador',
    name: 'Ventilador',
    icon: '🌀',
    description: 'Ventilador de escritorio (uso estacional)',
    monthlyKwh: 8,
    category: 'moderate',
    tips: 'Usa solo cuando sea necesario, considera ventilación natural'
  },
  {
    id: 'cargador',
    name: 'Cargadores Múltiples',
    icon: '🔌',
    description: 'Cargadores de dispositivos varios',
    monthlyKwh: 2,
    category: 'sustainable',
    tips: 'Desconecta cargadores cuando no estén en uso'
  },
  {
    id: 'router',
    name: 'Router WiFi',
    icon: '📡',
    description: 'Router/Modem (encendido 24/7)',
    monthlyKwh: 10,
    category: 'moderate',
    tips: 'Configura horarios de apagado automático si es posible'
  },
  {
    id: 'impresora',
    name: 'Impresora',
    icon: '🖨️',
    description: 'Impresora (uso ocasional)',
    monthlyKwh: 5,
    category: 'moderate',
    tips: 'Apaga cuando no uses, considera impresión a doble cara'
  },
  {
    id: 'altavoces',
    name: 'Altavoces',
    icon: '🔊',
    description: 'Altavoces/Parantes (uso ocasional)',
    monthlyKwh: 4,
    category: 'moderate',
    tips: 'Usa volumen moderado y apaga cuando no uses'
  },
  {
    id: 'microondas',
    name: 'Microondas',
    icon: '🍽️',
    description: 'Microondas (uso diario para comida)',
    monthlyKwh: 12,
    category: 'moderate',
    tips: 'Descongela alimentos antes de calentar'
  },
  {
    id: 'refrigerador',
    name: 'Refrigerador Pequeño',
    icon: '❄️',
    description: 'Refrigerador pequeño (encendido 24/7)',
    monthlyKwh: 30,
    category: 'high',
    tips: 'Mantén temperatura óptima (4-5°C), limpia la parte trasera'
  },
  {
    id: 'cafetera',
    name: 'Cafetera',
    icon: '☕',
    description: 'Cafetera eléctrica (uso diario)',
    monthlyKwh: 6,
    category: 'moderate',
    tips: 'Desconecta después de usar, usa solo el agua necesaria'
  },
  {
    id: 'plancha',
    name: 'Plancha',
    icon: '👔',
    description: 'Plancha de ropa (uso semanal)',
    monthlyKwh: 8,
    category: 'moderate',
    tips: 'Plancha en lotes grandes, usa temperatura adecuada'
  },
  {
    id: 'secador',
    name: 'Secador de Pelo',
    icon: '💨',
    description: 'Secador de pelo (uso diario 10-15 min)',
    monthlyKwh: 5,
    category: 'moderate',
    tips: 'Usa potencia baja cuando sea posible, seca al aire cuando puedas'
  }
];

// Carreras universitarias comunes
const CAREERS = [
  'Ingeniería en Informática',
  'Ingeniería Civil',
  'Ingeniería Industrial',
  'Ingeniería Comercial',
  'Medicina',
  'Derecho',
  'Psicología',
  'Pedagogía',
  'Arquitectura',
  'Diseño',
  'Periodismo',
  'Administración Pública',
  'Contador Auditor',
  'Enfermería',
  'Kinesiología',
  'Nutrición',
  'Educación Básica',
  'Educación Parvularia',
  'Trabajo Social',
  'Sociología',
  'Antropología',
  'Filosofía',
  'Historia',
  'Literatura',
  'Otra'
];

export default function ElectricityForm({ onSuccess }: { onSuccess?: () => void }) {
  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [loading, setLoading] = useState(false);
  const [selectedAppliances, setSelectedAppliances] = useState<Set<string>>(new Set());
  const [career, setCareer] = useState<string>('');
  const [schedule, setSchedule] = useState<'diurna' | 'vespertina'>('diurna');
  const [country, setCountry] = useState<string>('CL');
  const [period, setPeriod] = useState<string>(getCurrentPeriod());
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState<{
    kgCO2e: number;
    impactLevel: ImpactLevel;
    calcId: string;
    additionalInfo?: { label: string; value: string }[];
  } | null>(null);

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

  // Calcular consumo total basado en artefactos seleccionados
  const totalKwh = useMemo(() => {
    return Array.from(selectedAppliances).reduce((sum, id) => {
      const appliance = APPLIANCES.find(a => a.id === id);
      return sum + (appliance?.monthlyKwh || 0);
    }, 0);
  }, [selectedAppliances]);

  // Clasificar impacto ambiental
  const impactCategory = useMemo(() => {
    const selected = Array.from(selectedAppliances).map(id => 
      APPLIANCES.find(a => a.id === id)
    ).filter(Boolean) as Appliance[];

    if (selected.length === 0) return null;

    const highCount = selected.filter(a => a.category === 'high').length;
    const moderateCount = selected.filter(a => a.category === 'moderate').length;
    const sustainableCount = selected.filter(a => a.category === 'sustainable').length;

    // Clasificación basada en cantidad y tipo de artefactos
    if (highCount >= 2 || totalKwh > 50) {
      return { type: 'high', label: 'Contaminante', color: 'red', emoji: '🔴' };
    } else if (moderateCount >= 3 || totalKwh > 30) {
      return { type: 'moderate', label: 'Moderado', color: 'yellow', emoji: '🟡' };
    } else if (sustainableCount >= selected.length * 0.6 && totalKwh < 20) {
      return { type: 'sustainable', label: 'Sustentable', color: 'green', emoji: '🟢' };
    } else {
      return { type: 'moderate', label: 'Moderado', color: 'yellow', emoji: '🟡' };
    }
  }, [selectedAppliances, totalKwh]);

  const toggleAppliance = (id: string) => {
    const newSet = new Set(selectedAppliances);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedAppliances(newSet);
  };

  const selectAll = () => {
    setSelectedAppliances(new Set(APPLIANCES.map(a => a.id)));
  };

  const deselectAll = () => {
    setSelectedAppliances(new Set());
  };

  /**
   * Determina el nivel de impacto basado en las emisiones de electricidad
   * Thresholds específicos para consumo eléctrico:
   * - < 5 kg: muy bajo (consumo mínimo, ~12 kWh en Chile)
   * - < 10 kg: bajo (~25 kWh en Chile)
   * - < 20 kg: moderado (~50 kWh en Chile)
   * - < 30 kg: alto (~75 kWh en Chile)
   * - >= 30 kg: muy alto (consumo excesivo)
   */
  const determineImpactLevel = (kgCO2e: number): ImpactLevel => {
    if (kgCO2e < 5) return 'very-low';
    if (kgCO2e < 10) return 'low';
    if (kgCO2e < 20) return 'moderate';
    if (kgCO2e < 30) return 'high';
    return 'very-high';
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setModalData(null);
    // Limpiar formulario
    setSelectedAppliances(new Set());
    setCareer('');
    setSuccess(false);
    setResult(null);
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      // Validaciones antes de enviar
      if (selectedAppliances.size === 0) {
        throw new Error('Debes seleccionar al menos un artefacto eléctrico');
      }

      if (!career || career.trim() === '') {
        throw new Error('Debes seleccionar tu carrera universitaria');
      }

      // Validar que el consumo total sea válido
      if (totalKwh <= 0) {
        throw new Error('El consumo total debe ser mayor a 0 kWh');
      }

      // Obtener userId (puede venir de localStorage para JWT o ser extraído del token por el route handler para Auth0)
      const userId = localStorage.getItem('userId');

      // Si no hay userId en localStorage, el route handler lo extraerá del token
      // Esto permite que funcione tanto con JWT tradicional como con Auth0
      const payload: ElectricityInput = {
        kwh: totalKwh,
        country,
        period,
        idempotencyKey: `electricity-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        userId: userId || '', // El route handler lo sobrescribirá si es necesario
        selectedAppliances: Array.from(selectedAppliances),
        career: career.trim(),
        schedule,
      };

      const res = await api<CalcResult>('/calc/electricity', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);
      setSuccess(true);

      // Preparar información adicional para el modal
      const selectedAppliancesNames = Array.from(selectedAppliances)
        .map(id => APPLIANCES.find(a => a.id === id)?.name)
        .filter(Boolean)
        .slice(0, 3); // Mostrar solo los primeros 3

      const additionalInfo: { label: string; value: string }[] = [
        {
          label: 'Consumo Total',
          value: `${totalKwh.toFixed(1)} kWh/mes`
        },
        {
          label: 'Carrera',
          value: career
        },
        {
          label: 'Jornada',
          value: schedule === 'diurna' ? 'Diurna' : 'Vespertina'
        },
        {
          label: 'Artefactos',
          value: `${selectedAppliances.size} seleccionados${selectedAppliancesNames.length > 0 ? ': ' + selectedAppliancesNames.join(', ') : ''}${selectedAppliances.size > 3 ? '...' : ''}`
        },
      ];

      // Mostrar modal con resultados
      setModalData({
        kgCO2e: res.kgCO2e,
        impactLevel: determineImpactLevel(res.kgCO2e),
        calcId: res.calcId,
        additionalInfo,
      });
      setShowModal(true);

      if (onSuccess) {
        onSuccess();
      }
    } catch (e: any) {
      const errorMessage = e?.message || 'Error al calcular la huella de carbono';
      setError(errorMessage);
      console.error('Error en formulario de electricidad:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información Personal */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">📚 Información Personal</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Campo Carrera */}
            <div>
              <label htmlFor="career" className="block text-sm font-medium text-gray-700 mb-2">
                Carrera Universitaria <span className="text-red-500">*</span>
              </label>
              <select
                id="career"
                value={career}
                onChange={(e) => setCareer(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                required
                disabled={loading}
              >
                <option value="">Selecciona tu carrera</option>
                {CAREERS.map((c) => (
                  <option key={c} value={c} className="text-gray-900">
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Campo Jornada */}
          <div>
              <label htmlFor="schedule" className="block text-sm font-medium text-gray-700 mb-2">
                Jornada <span className="text-red-500">*</span>
            </label>
              <select
                id="schedule"
                value={schedule}
                onChange={(e) => setSchedule(e.target.value as 'diurna' | 'vespertina')}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              required
                disabled={loading}
              >
                <option value="diurna">Diurna</option>
                <option value="vespertina">Vespertina</option>
              </select>
            </div>
          </div>
        </div>

        {/* Selección de Artefactos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">⚡ Artefactos Eléctricos</h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecciona los artefactos que utilizas en tu día a día
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                disabled={loading}
              >
                Seleccionar Todos
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              disabled={loading}
              >
                Deseleccionar Todos
              </button>
            </div>
          </div>

          {/* Grid de Tarjetas de Artefactos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {APPLIANCES.map((appliance) => {
              const isSelected = selectedAppliances.has(appliance.id);
              const categoryColors = {
                sustainable: 'border-green-300 bg-green-50',
                moderate: 'border-yellow-300 bg-yellow-50',
                high: 'border-red-300 bg-red-50'
              };
              const categoryLabels = {
                sustainable: 'Sustentable',
                moderate: 'Moderado',
                high: 'Alto Impacto'
              };

              return (
                <div
                  key={appliance.id}
                  onClick={() => toggleAppliance(appliance.id)}
                  className={`
                    relative p-4 rounded-lg border-2 cursor-pointer transition-all
                    ${isSelected 
                      ? `${categoryColors[appliance.category]} ring-2 ring-green-500` 
                      : 'border-gray-200 bg-white hover:border-gray-300'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                >
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3">
                    <span className="text-3xl">{appliance.icon}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-800 mb-1">{appliance.name}</h4>
                      <p className="text-xs text-gray-600 mb-2">{appliance.description}</p>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700">
                          {appliance.monthlyKwh} kWh/mes
                        </span>
                        <span className={`
                          text-xs px-2 py-1 rounded
                          ${appliance.category === 'sustainable' ? 'bg-green-100 text-green-700' : ''}
                          ${appliance.category === 'moderate' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${appliance.category === 'high' ? 'bg-red-100 text-red-700' : ''}
                        `}>
                          {categoryLabels[appliance.category]}
                        </span>
                      </div>
                      {appliance.tips && isSelected && (
                        <p className="text-xs text-gray-500 mt-2 italic">
                          💡 {appliance.tips}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen de Selección */}
          {selectedAppliances.size > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Artefactos seleccionados: {selectedAppliances.size}
                </span>
                <span className="text-lg font-bold text-green-600">
                  {totalKwh.toFixed(1)} kWh/mes
                </span>
              </div>
              {impactCategory && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-2xl">{impactCategory.emoji}</span>
                  <span className={`text-sm font-semibold ${
                    impactCategory.color === 'green' ? 'text-green-700' :
                    impactCategory.color === 'yellow' ? 'text-yellow-700' :
                    'text-red-700'
                  }`}>
                    Impacto: {impactCategory.label}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Configuración Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Campo País */}
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
              disabled={loading}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code} className="text-gray-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Campo Período */}
          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
              Período (YYYY-MM)
            </label>
            <input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading || selectedAppliances.size === 0 || !career}
          className="w-full md:w-auto px-8 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
        >
          {loading ? 'Calculando...' : `Calcular Huella de Carbono (${totalKwh.toFixed(1)} kWh)`}
        </button>
      </form>

      {/* Mensaje de éxito */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-800">
            ✅ Huella de carbono registrada exitosamente
          </p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="p-6 bg-gradient-to-br from-green-50 to-blue-50 border border-green-200 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">
            Resultado del Cálculo
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Huella de Carbono:</span>
              <span className="text-2xl font-bold text-green-600">
                {result.kgCO2e.toFixed(2)} kg CO₂e
              </span>
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">Consumo Total:</span>
              <span className="font-semibold text-gray-700">{totalKwh.toFixed(1)} kWh</span>
            </div>
            {impactCategory && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">Impacto Ambiental:</span>
                <span className={`font-semibold ${
                  impactCategory.color === 'green' ? 'text-green-600' :
                  impactCategory.color === 'yellow' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {impactCategory.emoji} {impactCategory.label}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-500">ID de Cálculo:</span>
              <span className="font-mono text-xs text-gray-600">{result.calcId}</span>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                💡 Este cálculo utiliza factores de emisión específicos por país y representa 
                las emisiones equivalentes de dióxido de carbono generadas por tu consumo eléctrico.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Resultados */}
      {modalData && (
        <ResultModal
          isOpen={showModal}
          onClose={handleCloseModal}
          kgCO2e={modalData.kgCO2e}
          impactLevel={modalData.impactLevel}
          category="electricidad"
          calcId={modalData.calcId}
          additionalInfo={modalData.additionalInfo}
        />
      )}
    </div>
  );
}
