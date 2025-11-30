'use client';

import { useEffect } from 'react';

export type ImpactLevel = 'very-low' | 'low' | 'moderate' | 'high' | 'very-high';

interface MotivationalMessage {
  title: string;
  message: string;
  quote: string;
  author: string;
  source: string;
  icon: string;
  color: string;
  bgGradient: string;
  borderColor: string;
  actionTip: string;
}

const MOTIVATIONAL_MESSAGES: Record<ImpactLevel, MotivationalMessage> = {
  'very-low': {
    title: '¡Excelente! Eres un ejemplo a seguir',
    message: '¡Felicitaciones! Tu huella de carbono es muy baja. Estás tomando acciones concretas que marcan la diferencia en la lucha contra el cambio climático. Cada acción cuenta y tu compromiso es inspirador.',
    quote: '"No heredamos la Tierra de nuestros ancestros, la tomamos prestada de nuestros hijos."',
    author: 'Proverbio Indígena',
    source: 'Cultura Ancestral',
    icon: '🌟',
    color: 'text-emerald-700',
    bgGradient: 'from-emerald-50 via-green-50 to-teal-50',
    borderColor: 'border-emerald-400',
    actionTip: 'Sigue así y comparte tus hábitos sustentables con otros estudiantes.'
  },
  'low': {
    title: '¡Muy bien! Vas por el camino correcto',
    message: 'Tu huella de carbono es baja. Estás contribuyendo positivamente al cuidado del planeta. Pequeñas acciones como las tuyas, multiplicadas por millones de personas, pueden generar un cambio real.',
    quote: '"El cambio climático es el desafío definitorio de nuestra era, y estamos en un momento decisivo."',
    author: 'Ban Ki-moon',
    source: 'Ex Secretario General de la ONU',
    icon: '🌱',
    color: 'text-green-700',
    bgGradient: 'from-green-50 via-lime-50 to-emerald-50',
    borderColor: 'border-green-400',
    actionTip: 'Busca maneras de reducir aún más tu impacto y motiva a otros.'
  },
  'moderate': {
    title: 'Buen inicio, hay espacio para mejorar',
    message: 'Tu huella de carbono es moderada. Estás en la media, pero tienes potencial para reducir tu impacto. Cada pequeño cambio en tus hábitos puede hacer una gran diferencia.',
    quote: '"No hay pasajeros en la nave espacial Tierra. Todos somos tripulación."',
    author: 'Marshall McLuhan',
    source: 'Filósofo y Educador Canadiense',
    icon: '⚖️',
    color: 'text-yellow-700',
    bgGradient: 'from-yellow-50 via-amber-50 to-orange-50',
    borderColor: 'border-yellow-400',
    actionTip: 'Identifica áreas donde puedas reducir emisiones: reciclaje, transporte, consumo.'
  },
  'high': {
    title: 'Es momento de actuar',
    message: 'Tu huella de carbono es alta. Pero reconocerlo es el primer paso para el cambio. Calcular tu impacto demuestra que te importa, y ahora puedes tomar acciones concretas para reducirlo.',
    quote: '"El calentamiento global no es una predicción. Está sucediendo."',
    author: 'James Hansen',
    source: 'NASA - Climatólogo',
    icon: '⚠️',
    color: 'text-orange-700',
    bgGradient: 'from-orange-50 via-amber-50 to-yellow-50',
    borderColor: 'border-orange-400',
    actionTip: 'Prioriza cambios de alto impacto: compostaje, reciclaje, transporte sustentable.'
  },
  'very-high': {
    title: 'Tu planeta te necesita',
    message: 'Tu huella de carbono es muy alta. Pero no te desanimes: has dado el paso más importante al medirla. Ahora conoces tu impacto y puedes transformarlo. Cada acción que tomes de ahora en adelante cuenta.',
    quote: '"Chile es uno de los países más vulnerables al cambio climático. Actuar ahora no es opcional, es urgente."',
    author: 'Maisa Rojas',
    source: 'Ministra del Medio Ambiente de Chile, IPCC',
    icon: '🔥',
    color: 'text-red-700',
    bgGradient: 'from-red-50 via-orange-50 to-amber-50',
    borderColor: 'border-red-400',
    actionTip: 'Empieza hoy: separa residuos, usa transporte público, reduce consumo eléctrico.'
  }
};

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  kgCO2e: number;
  impactLevel: ImpactLevel;
  category: 'residuos' | 'transporte' | 'electricidad';
  calcId: string;
  additionalInfo?: {
    label: string;
    value: string;
  }[];
}

const CATEGORY_INFO = {
  residuos: {
    icon: '♻️',
    name: 'Residuos',
    unit: 'de residuos',
    context: 'Estudiante universitario promedio en Chile: 3-6 kg/semana de residuos',
  },
  transporte: {
    icon: '🚗',
    name: 'Transporte',
    unit: 'de movilidad',
    context: 'Un viaje en auto emite ~0.2 kg CO₂e/km, en metro ~0.03 kg CO₂e/km',
  },
  electricidad: {
    icon: '⚡',
    name: 'Electricidad',
    unit: 'de consumo eléctrico',
    context: 'Hogar promedio en Chile: ~200 kWh/mes (~80 kg CO₂e/mes)',
  },
};

export default function ResultModal({
  isOpen,
  onClose,
  kgCO2e,
  impactLevel,
  category,
  calcId,
  additionalInfo = []
}: ResultModalProps) {
  const motivationalData = MOTIVATIONAL_MESSAGES[impactLevel];
  const categoryData = CATEGORY_INFO[category];

  // Cerrar con ESC
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevenir scroll del body cuando el modal está abierto
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          className="pointer-events-auto bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-modal-slide-up"
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          {/* Header con gradiente */}
          <div className={`bg-gradient-to-r ${motivationalData.bgGradient} border-b-4 ${motivationalData.borderColor} p-6 relative`}>
            {/* Botón cerrar */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/80 hover:bg-white shadow-lg transition-all hover:scale-110 group"
              aria-label="Cerrar modal"
            >
              <span className="text-2xl text-gray-600 group-hover:text-gray-800 transition-colors">×</span>
            </button>

            {/* Icono principal */}
            <div className="flex justify-center mb-4">
              <div className="w-20 h-20 rounded-full bg-white shadow-xl flex items-center justify-center animate-bounce-slow">
                <span className="text-5xl">{motivationalData.icon}</span>
              </div>
            </div>

            {/* Título */}
            <h2
              id="modal-title"
              className={`text-3xl font-black text-center ${motivationalData.color} mb-2`}
            >
              {motivationalData.title}
            </h2>

            {/* Categoría */}
            <div className="flex items-center justify-center gap-2 text-gray-600">
              <span className="text-2xl">{categoryData.icon}</span>
              <span className="font-semibold">Huella de Carbono - {categoryData.name}</span>
            </div>
          </div>

          {/* Body */}
          <div className="p-6 space-y-6">
            {/* Resultado principal */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-300 rounded-xl p-6 shadow-lg">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">Tu huella de carbono {categoryData.unit}</p>
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className={`text-5xl font-black ${kgCO2e >= 0 ? 'text-orange-600' : 'text-green-600'}`}>
                    {kgCO2e >= 0 ? '+' : ''}{kgCO2e.toFixed(2)}
                  </span>
                  <span className="text-2xl font-bold text-gray-600">kg CO₂e</span>
                </div>
                <p className="text-xs text-gray-500 italic">{categoryData.context}</p>
              </div>

              {/* Información adicional */}
              {additionalInfo.length > 0 && (
                <div className="mt-4 pt-4 border-t-2 border-blue-200">
                  <div className="grid grid-cols-2 gap-3">
                    {additionalInfo.map((info, idx) => (
                      <div key={idx} className="bg-white rounded-lg p-3 shadow-sm">
                        <p className="text-xs text-gray-500 mb-1">{info.label}</p>
                        <p className="text-sm font-bold text-gray-800">{info.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mensaje motivacional */}
            <div className="space-y-4">
              <p className="text-gray-700 leading-relaxed text-center">
                {motivationalData.message}
              </p>

              {/* Cita inspiradora */}
              <div className={`bg-gradient-to-r ${motivationalData.bgGradient} border-l-4 ${motivationalData.borderColor} rounded-r-lg p-5 shadow-md`}>
                <p className={`text-lg font-serif italic ${motivationalData.color} mb-3 leading-relaxed`}>
                  {motivationalData.quote}
                </p>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800">— {motivationalData.author}</p>
                    <p className="text-xs text-gray-600">{motivationalData.source}</p>
                  </div>
                  <span className="text-3xl opacity-30">📖</span>
                </div>
              </div>

              {/* Tip de acción */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">💡</span>
                  <div>
                    <p className="font-bold text-blue-800 mb-1">Próximo Paso:</p>
                    <p className="text-sm text-blue-700">{motivationalData.actionTip}</p>
                  </div>
                </div>
              </div>

              {/* Datos del cálculo */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-xs text-gray-500 mb-2">Información del cálculo:</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-600">ID de cálculo:</span>
                  <span className="text-xs font-mono text-gray-800">{calcId}</span>
                </div>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-xs text-gray-600">Fecha:</span>
                  <span className="text-xs text-gray-800">{new Date().toLocaleDateString('es-CL')}</span>
                </div>
              </div>
            </div>

            {/* Importancia de medir */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-5">
              <h3 className="font-bold text-purple-800 mb-3 flex items-center gap-2">
                <span className="text-xl">🌍</span>
                ¿Por qué es importante calcular tu huella de carbono?
              </h3>
              <ul className="space-y-2 text-sm text-purple-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold flex-shrink-0">•</span>
                  <span><strong>Conciencia:</strong> Conocer tu impacto es el primer paso para reducirlo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold flex-shrink-0">•</span>
                  <span><strong>Acción:</strong> Solo lo que se mide se puede mejorar</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold flex-shrink-0">•</span>
                  <span><strong>Impacto:</strong> Según el IPCC, debemos reducir emisiones 45% para 2030</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-500 font-bold flex-shrink-0">•</span>
                  <span><strong>Futuro:</strong> Chile se comprometió a ser carbono neutral para 2050</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Footer con botones */}
          <div className="bg-gray-50 p-6 border-t-2 border-gray-200 flex gap-3 justify-end">
            <button
              onClick={onClose}
              className="px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold rounded-xl hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
            >
              <span>✓</span>
              Entendido, seguiré mejorando
            </button>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes modal-slide-up {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bounce-slow {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .animate-modal-slide-up {
          animation: modal-slide-up 0.3s ease-out;
        }

        .animate-bounce-slow {
          animation: bounce-slow 2s ease-in-out infinite;
        }
      `}</style>
    </>
  );
}
