/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState, useMemo } from 'react';
import { api } from '@/lib/api-client';
import type { WasteInput, WasteItem, CalcResult } from '@/types/calc';
import ResultModal, { type ImpactLevel } from './ResultModal';

// Definición completa de tipos de residuos con información detallada
interface WasteType {
  id: 'organic' | 'paper' | 'plastic' | 'glass' | 'metal' | 'other';
  name: string;
  icon: string;
  emoji: string;
  description: string;
  longDescription: string;
  unit: string;
  examples: string[];
  tips: string[];
  impactLevel: 'low' | 'moderate' | 'high';
  color: string;
  bgColor: string;
  borderColor: string;
  // Factores de emisión por método de disposición (kgCO2e/kg)
  emissionFactors: {
    mixed: number;
    recycling: number;
    composting: number;
    landfill: number;
  };
  recyclable: boolean;
  compostable: boolean;
  avgWeeklyKg: { min: number; max: number; typical: number };
}

const WASTE_TYPES: WasteType[] = [
  {
    id: 'organic',
    name: 'Residuos Orgánicos',
    icon: '🍎',
    emoji: '🌱',
    description: 'Restos de alimentos, cáscaras de frutas/verduras, residuos de jardín',
    longDescription: 'Los residuos orgánicos son materiales biodegradables que provienen de plantas y animales. Al descomponerse en rellenos sanitarios generan metano (CH4), un gas 25 veces más potente que el CO2. Compostarlos reduce emisiones en un 75%.',
    unit: 'kg/semana',
    examples: ['Cáscaras de frutas', 'Restos de verduras', 'Café molido', 'Bolsas de té', 'Restos de comida', 'Hojas y pasto'],
    tips: [
      'Compostar reduce emisiones en 75% vs relleno sanitario',
      'Separa restos de comida para compostaje doméstico',
      'Evita desperdiciar alimentos planificando tus compras',
      'Los residuos orgánicos representan ~40% de la basura doméstica'
    ],
    impactLevel: 'high',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    emissionFactors: {
      mixed: 0.40,
      recycling: 0.40,
      composting: -0.10,
      landfill: 0.65
    },
    recyclable: false,
    compostable: true,
    avgWeeklyKg: { min: 2, max: 5, typical: 3.5 }
  },
  {
    id: 'paper',
    name: 'Papel y Cartón',
    icon: '📄',
    emoji: '📚',
    description: 'Papel, cartón, periódicos, revistas, cuadernos, cajas',
    longDescription: 'El papel y cartón son altamente reciclables. Reciclar 1 kg de papel ahorra aproximadamente -1.20 kg CO2e al evitar la tala de árboles y el proceso de fabricación de papel nuevo. Es uno de los materiales con mayor beneficio ambiental al reciclarse.',
    unit: 'kg/semana',
    examples: ['Cuadernos usados', 'Apuntes de clase', 'Cajas de delivery', 'Periódicos', 'Revistas', 'Sobres y folletos'],
    tips: [
      'Reciclando papel ahorras -1.20 kg CO2e por kg (¡beneficio neto!)',
      'Usa papel por ambos lados antes de reciclar',
      'Prefiere apuntes digitales cuando sea posible',
      'El papel reciclado usa 40% menos energía que el papel nuevo'
    ],
    impactLevel: 'moderate',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-300',
    emissionFactors: {
      mixed: 0.35,
      recycling: -1.20,
      composting: 0.35,
      landfill: 0.90
    },
    recyclable: true,
    compostable: false,
    avgWeeklyKg: { min: 0.5, max: 3, typical: 2.0 }
  },
  {
    id: 'plastic',
    name: 'Plásticos',
    icon: '🥤',
    emoji: '♻️',
    description: 'Botellas PET, envases, bolsas, empaques, contenedores plásticos',
    longDescription: 'Los plásticos son derivados del petróleo y tardan cientos de años en degradarse. Reciclarlos ahorra -0.80 kg CO2e por kg al evitar la producción de plástico virgen. Reduce su uso prefiriendo alternativas reutilizables.',
    unit: 'kg/semana',
    examples: ['Botellas de bebida', 'Envases de comida', 'Bolsas plásticas', 'Film transparente', 'Tapas y tapones', 'Vasos desechables'],
    tips: [
      'Prefiere botellas reutilizables sobre desechables',
      'Reciclando plástico ahorras 0.80 kg CO2e por kg',
      'Evita productos con exceso de empaque plástico',
      'Solo el 9% del plástico mundial se recicla actualmente'
    ],
    impactLevel: 'high',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-300',
    emissionFactors: {
      mixed: 0.45,
      recycling: -0.80,
      composting: 0.45,
      landfill: 0.50
    },
    recyclable: true,
    compostable: false,
    avgWeeklyKg: { min: 0.3, max: 2, typical: 1.5 }
  },
  {
    id: 'glass',
    name: 'Vidrio',
    icon: '🍾',
    emoji: '🔄',
    description: 'Botellas de vidrio, frascos, envases de conservas',
    longDescription: 'El vidrio es 100% reciclable infinitamente sin pérdida de calidad. Reciclarlo ahorra -0.40 kg CO2e por kg al reducir la temperatura de fusión necesaria. Es un material noble que mantiene todas sus propiedades al reciclarse.',
    unit: 'kg/semana',
    examples: ['Botellas de bebidas', 'Frascos de mermelada', 'Envases de conserva', 'Botellas de vino/cerveza', 'Frascos de café', 'Envases de vidrio'],
    tips: [
      'El vidrio es 100% reciclable sin límite de veces',
      'Lava y separa por color si es posible',
      'Reciclando vidrio ahorras 0.40 kg CO2e por kg',
      'Prefiere envases de vidrio retornable cuando sea posible'
    ],
    impactLevel: 'low',
    color: 'text-cyan-700',
    bgColor: 'bg-cyan-50',
    borderColor: 'border-cyan-300',
    emissionFactors: {
      mixed: 0.20,
      recycling: -0.40,
      composting: 0.20,
      landfill: 0.25
    },
    recyclable: true,
    compostable: false,
    avgWeeklyKg: { min: 0.2, max: 1.5, typical: 0.5 }
  },
  {
    id: 'metal',
    name: 'Metales',
    icon: '🔩',
    emoji: '⚙️',
    description: 'Latas de aluminio, latas de conserva, papel aluminio',
    longDescription: 'Los metales tienen el MAYOR beneficio ambiental al reciclarse: -2.50 kg CO2e por kg. Esto se debe a que evitan la minería y fundición de metal primario, procesos extremadamente intensivos en energía. Recicla siempre tus latas.',
    unit: 'kg/semana',
    examples: ['Latas de bebidas', 'Latas de atún/conservas', 'Papel aluminio', 'Tapas metálicas', 'Envases de aerosol', 'Alambres'],
    tips: [
      '¡MÁXIMO beneficio! Reciclando metales ahorras -2.50 kg CO2e/kg',
      'Reciclar aluminio usa 95% menos energía que producirlo nuevo',
      'Aplasta latas para ahorrar espacio en reciclaje',
      'Los metales se pueden reciclar infinitamente'
    ],
    impactLevel: 'low',
    color: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    emissionFactors: {
      mixed: 0.30,
      recycling: -2.50,
      composting: 0.30,
      landfill: 0.35
    },
    recyclable: true,
    compostable: false,
    avgWeeklyKg: { min: 0.1, max: 0.8, typical: 0.3 }
  },
  {
    id: 'other',
    name: 'Otros Residuos',
    icon: '🗑️',
    emoji: '♻️',
    description: 'Textiles, caucho, cerámicos, residuos mixtos no clasificables',
    longDescription: 'Esta categoría incluye materiales difíciles de reciclar como textiles, caucho, cerámicos y otros residuos mixtos. Muchos textiles pueden donarse o reciclarse en puntos especializados. Reduce su generación siendo consciente de tus compras.',
    unit: 'kg/semana',
    examples: ['Ropa vieja', 'Textiles dañados', 'Zapatos', 'Caucho', 'Cerámicos rotos', 'Residuos mixtos'],
    tips: [
      'Dona ropa en buen estado en lugar de desecharla',
      'Busca puntos de reciclaje textil especializados',
      'Repara antes de desechar (zapatos, ropa, etc.)',
      'Considera upcycling para darles nueva vida'
    ],
    impactLevel: 'moderate',
    color: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-300',
    emissionFactors: {
      mixed: 0.50,
      recycling: 0.50,
      composting: 0.50,
      landfill: 0.55
    },
    recyclable: false,
    compostable: false,
    avgWeeklyKg: { min: 0.2, max: 2, typical: 1.0 }
  }
];

const DISPOSAL_METHODS = [
  {
    id: 'mixed' as const,
    name: 'Gestión Mixta',
    icon: '♻️',
    description: 'Mezcla típica chilena',
    longDescription: '60% relleno sanitario, 30% reciclaje, 10% otros',
    color: 'bg-gray-600',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-300',
    impactLevel: 'moderate',
    badge: 'Más Común'
  },
  {
    id: 'recycling' as const,
    name: 'Reciclaje',
    icon: '♻️',
    description: 'Separación y reciclaje completo',
    longDescription: 'Materiales procesados profesionalmente para reutilización',
    color: 'bg-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
    impactLevel: 'low',
    badge: 'Menor Impacto'
  },
  {
    id: 'composting' as const,
    name: 'Compostaje',
    icon: '🌱',
    description: 'Compostaje de orgánicos',
    longDescription: 'Solo aplicable a residuos orgánicos, genera abono',
    color: 'bg-emerald-600',
    textColor: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-300',
    impactLevel: 'very-low',
    badge: 'Beneficio Neto'
  },
  {
    id: 'landfill' as const,
    name: 'Relleno Sanitario',
    icon: '🏭',
    description: 'Disposición directa en relleno',
    longDescription: 'Mayor impacto, genera metano y lixiviados',
    color: 'bg-red-600',
    textColor: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
    impactLevel: 'high',
    badge: 'Mayor Impacto'
  }
];

export default function WasteForm({ onSuccess }: { onSuccess?: () => void }) {
  const getCurrentPeriod = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  };

  const [loading, setLoading] = useState(false);
  const [selectedWasteTypes, setSelectedWasteTypes] = useState<Set<string>>(new Set());
  const [wasteWeights, setWasteWeights] = useState<Record<string, number>>({});
  const [disposalMethod, setDisposalMethod] = useState<'mixed' | 'recycling' | 'composting' | 'landfill'>('mixed');
  const [country, setCountry] = useState<string>('CL');
  const [period, setPeriod] = useState<string>(getCurrentPeriod());
  const [result, setResult] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const countries = [
    { code: 'CL', name: 'Chile' },
    { code: 'AR', name: 'Argentina' },
    { code: 'BR', name: 'Brasil' },
    { code: 'CO', name: 'Colombia' },
    { code: 'MX', name: 'México' },
    { code: 'PE', name: 'Perú' },
  ];

  // Calcular peso total
  const totalWeight = useMemo(() => {
    return Object.values(wasteWeights).reduce((sum, w) => sum + (w || 0), 0);
  }, [wasteWeights]);

  // Calcular emisiones estimadas basadas en el método de disposición
  const estimatedEmissions = useMemo(() => {
    let total = 0;
    WASTE_TYPES.forEach(type => {
      const weight = wasteWeights[type.id] || 0;
      if (weight > 0) {
        const factor = type.emissionFactors[disposalMethod];
        total += weight * factor;
      }
    });
    return total;
  }, [wasteWeights, disposalMethod]);

  // Clasificar impacto ambiental
  const impactCategory = useMemo(() => {
    if (totalWeight === 0) return null;

    if (disposalMethod === 'recycling') {
      return { type: 'sustainable', label: 'Sustentable', color: 'green', emoji: '🟢' };
    } else if (disposalMethod === 'composting') {
      return { type: 'very-sustainable', label: 'Muy Sustentable', color: 'emerald', emoji: '💚' };
    } else if (disposalMethod === 'landfill') {
      return { type: 'high', label: 'Alto Impacto', color: 'red', emoji: '🔴' };
    } else {
      // Gestión mixta - evaluar por peso
      if (totalWeight < 3) {
        return { type: 'sustainable', label: 'Sustentable', color: 'green', emoji: '🟢' };
      } else if (totalWeight < 6) {
        return { type: 'moderate', label: 'Moderado', color: 'yellow', emoji: '🟡' };
      } else {
        return { type: 'high', label: 'Alto', color: 'red', emoji: '🔴' };
      }
    }
  }, [totalWeight, disposalMethod]);

  const toggleWasteType = (wasteTypeId: string) => {
    const newSet = new Set(selectedWasteTypes);
    if (newSet.has(wasteTypeId)) {
      newSet.delete(wasteTypeId);
      // Limpiar peso cuando se deselecciona
      const newWeights = { ...wasteWeights };
      delete newWeights[wasteTypeId];
      setWasteWeights(newWeights);
    } else {
      newSet.add(wasteTypeId);
      // Inicializar peso en 0 cuando se selecciona
      setWasteWeights(prev => ({ ...prev, [wasteTypeId]: 0 }));
    }
    setSelectedWasteTypes(newSet);
  };

  const updateWeight = (wasteTypeId: string, value: number) => {
    setWasteWeights(prev => ({
      ...prev,
      [wasteTypeId]: value
    }));
  };

  const selectAll = () => {
    const allIds = WASTE_TYPES.map(t => t.id);
    setSelectedWasteTypes(new Set(allIds));
    const initialWeights: Record<string, number> = {};
    allIds.forEach(id => {
      initialWeights[id] = wasteWeights[id] || 0;
    });
    setWasteWeights(initialWeights);
  };

  const deselectAll = () => {
    setSelectedWasteTypes(new Set());
    setWasteWeights({});
  };

  // Determinar nivel de impacto basado en kgCO2e para residuos
  const determineImpactLevel = (kgCO2e: number): ImpactLevel => {
    // Para residuos semanales (contexto estudiantil):
    // Muy bajo: < 1 kg CO2e (excelente gestión, mucho reciclaje/compostaje)
    // Bajo: 1-3 kg CO2e (buena gestión)
    // Moderado: 3-5 kg CO2e (promedio)
    // Alto: 5-8 kg CO2e (necesita mejorar)
    // Muy alto: > 8 kg CO2e (urgente mejorar)

    if (kgCO2e < 1) return 'very-low';
    if (kgCO2e < 3) return 'low';
    if (kgCO2e < 5) return 'moderate';
    if (kgCO2e < 8) return 'high';
    return 'very-high';
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    setResult(null);

    try {
      // Validar que haya al menos un tipo seleccionado con peso > 0
      const itemsWithWeight = Array.from(selectedWasteTypes).filter(
        id => (wasteWeights[id] || 0) > 0
      );

      if (itemsWithWeight.length === 0) {
        throw new Error('Debes seleccionar al menos un tipo de residuo e ingresar su peso');
      }

      // Construir wasteItems solo con los que tienen peso > 0
      const wasteItems: WasteItem[] = itemsWithWeight.map(id => ({
        wasteType: id as 'organic' | 'paper' | 'plastic' | 'glass' | 'metal' | 'other',
        weightKg: wasteWeights[id]
      }));

      const userId = localStorage.getItem('userId');

      const payload: WasteInput = {
        wasteItems,
        disposalMethod,
        country,
        period,
        idempotencyKey: `waste-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        userId: userId || '',
      };

      const res = await api<CalcResult>('/calc/waste', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      setResult(res);
      setSuccess(true);

      // Mostrar modal automáticamente
      setShowModal(true);

      if (onSuccess) {
        onSuccess();
      }

      // NO limpiar automáticamente - dejar que el usuario cierre el modal
      // El modal incluye el botón para continuar
    } catch (e: any) {
      const errorMessage = e?.message || 'Error al calcular la huella de carbono de residuos';
      setError(errorMessage);
      console.error('Error en formulario de residuos:', e);
    } finally {
      setLoading(false);
    }
  }

  // Preparar información adicional para el modal
  const modalAdditionalInfo = result ? [
    { label: 'Peso Total Semanal', value: `${totalWeight.toFixed(2)} kg` },
    { label: 'Estimación Mensual', value: `${(totalWeight * 4.3).toFixed(1)} kg` },
    { label: 'Método de Gestión', value: DISPOSAL_METHODS.find(m => m.id === disposalMethod)?.name || 'Mixed' },
    { label: 'Tipos Registrados', value: `${selectedWasteTypes.size} tipos` },
  ] : [];

  return (
    <div className="space-y-6">
      {/* Modal de Resultado */}
      {result && (
        <ResultModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            // Limpiar formulario cuando cierra el modal
            setTimeout(() => {
              setSelectedWasteTypes(new Set());
              setWasteWeights({});
              setDisposalMethod('mixed');
              setSuccess(false);
              setResult(null);
            }, 300);
          }}
          kgCO2e={result.kgCO2e}
          impactLevel={determineImpactLevel(result.kgCO2e)}
          category="residuos"
          calcId={result.calcId}
          additionalInfo={modalAdditionalInfo}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información introductoria */}
        <div className="bg-gradient-to-r from-green-50 via-emerald-50 to-cyan-50 border-2 border-green-300 rounded-xl p-5 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-3xl">♻️</span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-800 mb-2">🗑️ Calculadora de Huella de Carbono por Residuos</h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                Selecciona los tipos de residuos que generas y registra el peso semanal aproximado de cada uno.
                <strong className="block mt-2">📊 Promedio estudiante universitario: 3-6 kg/semana total</strong>
                <span className="block mt-1 text-xs text-gray-600">Usa una balanza de cocina o estima basándote en volumen. 1 bolsa pequeña ≈ 2-3 kg.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Selección de Tipos de Residuos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">🗑️ Tipos de Residuos que Generas</h3>
              <p className="text-sm text-gray-600 mt-1">
                Selecciona cada tipo de residuo que produces e ingresa su peso semanal
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={loading}
              >
                Seleccionar Todos
              </button>
              <button
                type="button"
                onClick={deselectAll}
                className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
                disabled={loading}
              >
                Deseleccionar Todos
              </button>
            </div>
          </div>

          {/* Grid de Cards de Tipos de Residuos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {WASTE_TYPES.map((wasteType) => {
              const isSelected = selectedWasteTypes.has(wasteType.id);
              const currentWeight = wasteWeights[wasteType.id] || 0;

              const impactColors = {
                low: 'border-green-300 bg-green-50',
                moderate: 'border-yellow-300 bg-yellow-50',
                high: 'border-red-300 bg-red-50'
              };

              const impactLabels = {
                low: 'Bajo Impacto',
                moderate: 'Impacto Moderado',
                high: 'Alto Impacto'
              };

              return (
                <div
                  key={wasteType.id}
                  className={`
                    relative p-5 rounded-xl border-2 transition-all duration-200 cursor-pointer
                    ${isSelected
                      ? `${impactColors[wasteType.impactLevel]} ring-2 ring-green-500 shadow-lg`
                      : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-md'
                    }
                    ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={() => !loading && toggleWasteType(wasteType.id)}
                >
                  {/* Checkmark cuando está seleccionado */}
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-7 h-7 bg-green-500 rounded-full flex items-center justify-center shadow-md">
                      <span className="text-white text-sm font-bold">✓</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3">
                    {/* Icono */}
                    <div className="flex-shrink-0">
                      <span className="text-4xl">{wasteType.icon}</span>
                    </div>

                    {/* Contenido */}
                    <div className="flex-1 min-w-0">
                      {/* Nombre */}
                      <h4 className="font-bold text-gray-800 mb-1 text-base">
                        {wasteType.name}
                      </h4>

                      {/* Descripción corta */}
                      <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                        {wasteType.description}
                      </p>

                      {/* Ejemplos */}
                      <div className="flex flex-wrap gap-1 mb-3">
                        {wasteType.examples.slice(0, 3).map((example, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-md"
                          >
                            {example}
                          </span>
                        ))}
                      </div>

                      {/* Badge de impacto */}
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-gray-500">
                          Promedio: {wasteType.avgWeeklyKg.typical} {wasteType.unit}
                        </span>
                        <span className={`
                          text-xs px-2 py-1 rounded-md font-medium
                          ${wasteType.impactLevel === 'low' ? 'bg-green-100 text-green-700' : ''}
                          ${wasteType.impactLevel === 'moderate' ? 'bg-yellow-100 text-yellow-700' : ''}
                          ${wasteType.impactLevel === 'high' ? 'bg-red-100 text-red-700' : ''}
                        `}>
                          {impactLabels[wasteType.impactLevel]}
                        </span>
                      </div>

                      {/* Input de peso cuando está seleccionado */}
                      {isSelected && (
                        <div className="mt-4 pt-4 border-t-2 border-gray-200" onClick={(e) => e.stopPropagation()}>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Peso semanal ({wasteType.unit}):
                          </label>
                          <div className="flex items-center gap-3">
                            <input
                              type="number"
                              min="0"
                              max="20"
                              step="0.1"
                              value={currentWeight}
                              onChange={(e) => updateWeight(wasteType.id, parseFloat(e.target.value) || 0)}
                              className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-gray-900 font-semibold focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                              placeholder="0.0"
                              disabled={loading}
                            />
                            <span className="text-lg font-bold text-green-600 min-w-[60px]">
                              {currentWeight.toFixed(1)} kg
                            </span>
                          </div>

                          {/* Slider visual */}
                          <input
                            type="range"
                            min="0"
                            max="10"
                            step="0.1"
                            value={currentWeight}
                            onChange={(e) => updateWeight(wasteType.id, parseFloat(e.target.value))}
                            className="w-full h-2 mt-3 rounded-lg appearance-none cursor-pointer accent-green-600"
                            disabled={loading}
                            style={{
                              background: currentWeight > 0
                                ? `linear-gradient(to right, rgb(34 197 94) 0%, rgb(34 197 94) ${Math.min(currentWeight * 10, 100)}%, rgb(229 231 235) ${Math.min(currentWeight * 10, 100)}%, rgb(229 231 235) 100%)`
                                : 'rgb(229 231 235)'
                            }}
                          />

                          {/* Factores de emisión */}
                          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-xs font-semibold text-blue-800 mb-2">
                              📊 Factores de Emisión (kgCO2e/kg):
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Gestión mixta:</span>
                                <span className={`font-bold ${wasteType.emissionFactors.mixed >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {wasteType.emissionFactors.mixed.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Reciclaje:</span>
                                <span className={`font-bold ${wasteType.emissionFactors.recycling >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {wasteType.emissionFactors.recycling.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Compostaje:</span>
                                <span className={`font-bold ${wasteType.emissionFactors.composting >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {wasteType.emissionFactors.composting.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Relleno:</span>
                                <span className={`font-bold ${wasteType.emissionFactors.landfill >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                  {wasteType.emissionFactors.landfill.toFixed(2)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Tips cuando tiene peso */}
                          {currentWeight > 0 && (
                            <div className="mt-4 space-y-2">
                              {wasteType.tips.slice(0, 2).map((tip, idx) => (
                                <p key={idx} className="text-xs text-green-700 italic flex items-start gap-2 bg-green-50 p-2 rounded-lg border border-green-200">
                                  <span className="flex-shrink-0">💡</span>
                                  <span className="flex-1">{tip}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Descripción larga cuando está seleccionado pero sin peso */}
                      {isSelected && currentWeight === 0 && (
                        <div className="mt-3 pt-3 border-t-2 border-gray-200">
                          <p className="text-xs text-gray-600 leading-relaxed italic">
                            {wasteType.longDescription}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumen de Selección */}
          {selectedWasteTypes.size > 0 && (
            <div className="bg-gradient-to-r from-blue-50 via-cyan-50 to-green-50 border-2 border-blue-300 rounded-xl p-5 shadow-md">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-bold text-gray-800">
                  Tipos seleccionados: {selectedWasteTypes.size} de {WASTE_TYPES.length}
                </span>
                <span className="text-3xl font-black text-blue-600">
                  {totalWeight.toFixed(2)} kg
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm">
                  <span className="text-gray-600">Peso semanal:</span>
                  <span className="font-bold text-gray-800">{totalWeight.toFixed(2)} kg</span>
                </div>
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm">
                  <span className="text-gray-600">Estimación mensual:</span>
                  <span className="font-bold text-gray-800">{(totalWeight * 4.3).toFixed(1)} kg</span>
                </div>
                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm">
                  <span className="text-gray-600">Emisiones estimadas:</span>
                  <span className={`font-bold ${estimatedEmissions >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {estimatedEmissions >= 0 ? '+' : ''}{estimatedEmissions.toFixed(2)} kg CO₂e
                  </span>
                </div>
                {impactCategory && (
                  <div className="flex justify-between items-center bg-white px-3 py-2 rounded-lg shadow-sm">
                    <span className="text-gray-600">Impacto:</span>
                    <span className={`font-bold flex items-center gap-1 ${
                      impactCategory.color === 'green' || impactCategory.color === 'emerald' ? 'text-green-600' :
                      impactCategory.color === 'yellow' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      <span>{impactCategory.emoji}</span> {impactCategory.label}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Método de Disposición */}
        <div>
          <h3 className="text-lg font-semibold text-gray-800 mb-3">🌍 Método de Gestión de Residuos</h3>
          <p className="text-sm text-gray-600 mb-4">
            Selecciona cómo gestionas tus residuos. Esto afecta significativamente las emisiones calculadas.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DISPOSAL_METHODS.map((method) => (
              <div
                key={method.id}
                onClick={() => setDisposalMethod(method.id)}
                className={`
                  relative p-5 rounded-xl border-2 cursor-pointer transition-all duration-200
                  ${disposalMethod === method.id
                    ? `${method.color} text-white ring-2 ring-offset-2 ring-green-500 shadow-xl`
                    : `${method.borderColor} ${method.bgColor} hover:border-gray-400 hover:shadow-md`
                  }
                  ${loading ? 'opacity-50 cursor-not-allowed' : ''}
                `}
              >
                {disposalMethod === method.id && (
                  <div className="absolute top-3 right-3 w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md">
                    <span className="text-green-600 text-sm font-bold">✓</span>
                  </div>
                )}

                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0">
                    <span className="text-4xl">{method.icon}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className={`font-bold text-lg ${disposalMethod === method.id ? 'text-white' : method.textColor}`}>
                        {method.name}
                      </h4>
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                        disposalMethod === method.id
                          ? 'bg-white/20 text-white'
                          : 'bg-gray-200 text-gray-700'
                      }`}>
                        {method.badge}
                      </span>
                    </div>
                    <p className={`text-sm mb-1 ${disposalMethod === method.id ? 'text-white/90' : 'text-gray-600'}`}>
                      {method.description}
                    </p>
                    <p className={`text-xs ${disposalMethod === method.id ? 'text-white/75' : 'text-gray-500'}`}>
                      {method.longDescription}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Configuración Adicional */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
              País
            </label>
            <select
              id="country"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white font-medium"
              disabled={loading}
            >
              {countries.map((c) => (
                <option key={c.code} value={c.code} className="text-gray-900">
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-700 mb-2">
              Período (YYYY-MM)
            </label>
            <input
              id="period"
              type="month"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full rounded-lg border-2 border-gray-300 px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 font-medium"
              required
              disabled={loading}
            />
          </div>
        </div>

        {/* Botón de envío */}
        <button
          type="submit"
          disabled={loading || selectedWasteTypes.size === 0 || totalWeight === 0}
          className="w-full px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold text-lg rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02]"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-3">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Calculando...
            </span>
          ) : (
            `♻️ Calcular Huella de Carbono (${totalWeight.toFixed(1)} kg de residuos)`
          )}
        </button>
      </form>

      {/* Mensaje de éxito */}
      {success && (
        <div className="p-5 bg-green-50 border-2 border-green-300 rounded-xl shadow-md animate-pulse">
          <p className="text-sm text-green-800 font-semibold flex items-center gap-2">
            <span className="text-2xl">✅</span>
            Huella de carbono de residuos registrada exitosamente
          </p>
        </div>
      )}

      {/* Mensaje de error */}
      {error && (
        <div className="p-5 bg-red-50 border-2 border-red-300 rounded-xl shadow-md">
          <p className="text-sm text-red-800 font-semibold flex items-center gap-2">
            <span className="text-2xl">⚠️</span>
            {error}
          </p>
        </div>
      )}

      {/* Resultado */}
      {result && (
        <div className="p-6 bg-gradient-to-br from-green-50 via-emerald-50 to-cyan-50 border-2 border-green-300 rounded-xl shadow-xl">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-2xl">🎉</span>
            Resultado del Cálculo de Residuos
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-4 bg-white rounded-lg shadow-sm">
              <span className="text-gray-700 font-medium">Huella de Carbono:</span>
              <span className={`text-3xl font-black ${result.kgCO2e >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {result.kgCO2e >= 0 ? '+' : ''}{result.kgCO2e.toFixed(2)} kg CO₂e
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm text-sm">
                <span className="text-gray-600">Peso Total:</span>
                <span className="font-bold text-gray-800">{totalWeight.toFixed(2)} kg/semana</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm text-sm">
                <span className="text-gray-600">Método:</span>
                <span className="font-bold text-gray-800">
                  {DISPOSAL_METHODS.find(m => m.id === disposalMethod)?.name}
                </span>
              </div>
            </div>
            {impactCategory && (
              <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm text-sm">
                <span className="text-gray-600">Impacto Ambiental:</span>
                <span className={`font-bold flex items-center gap-1 ${
                  impactCategory.color === 'green' || impactCategory.color === 'emerald' ? 'text-green-600' :
                  impactCategory.color === 'yellow' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {impactCategory.emoji} {impactCategory.label}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center p-3 bg-white rounded-lg shadow-sm text-sm">
              <span className="text-gray-600">ID de Cálculo:</span>
              <span className="font-mono text-xs text-gray-600">{result.calcId}</span>
            </div>
            <div className="mt-4 pt-4 border-t-2 border-green-200">
              <p className="text-sm text-gray-700 leading-relaxed font-medium mb-3">
                💡 <strong>Recomendaciones para Reducir Tu Huella:</strong>
              </p>
              <ul className="space-y-2 text-xs text-gray-600">
                <li className="flex items-start gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-600 flex-shrink-0 font-bold">✓</span>
                  <span><strong>Compostar orgánicos</strong> reduce emisiones en 75% comparado con relleno sanitario</span>
                </li>
                <li className="flex items-start gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-600 flex-shrink-0 font-bold">✓</span>
                  <span><strong>Reciclar metales</strong> tiene el mayor beneficio ambiental: -2.5 kg CO₂e por kg reciclado</span>
                </li>
                <li className="flex items-start gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-600 flex-shrink-0 font-bold">✓</span>
                  <span><strong>Separar papel y cartón</strong> para reciclaje ahorra -1.2 kg CO₂e por kg</span>
                </li>
                <li className="flex items-start gap-2 bg-white p-3 rounded-lg shadow-sm">
                  <span className="text-green-600 flex-shrink-0 font-bold">✓</span>
                  <span><strong>Reducir es mejor que reciclar:</strong> evita empaques innecesarios y prefiere productos reutilizables</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
