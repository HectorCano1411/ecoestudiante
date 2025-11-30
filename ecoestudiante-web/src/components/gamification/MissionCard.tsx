'use client';

import { useState } from 'react';
import type {
  Mission,
  MissionProgress,
  MissionCategory,
  MissionDifficulty,
  MissionStatus
} from '@/types/gamification';

interface MissionCardProps {
  mission: Mission;
  progress?: MissionProgress;
  onAccept?: (missionId: number) => Promise<void>;
  onComplete?: (missionId: number) => Promise<void>;
  compact?: boolean;
}

const categoryConfig: Record<MissionCategory, { color: string; bgColor: string; label: string; icon: string }> = {
  ELECTRICITY: {
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50 border-yellow-200',
    label: 'Electricidad',
    icon: '⚡'
  },
  TRANSPORT: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    label: 'Transporte',
    icon: '🚗'
  },
  WASTE: {
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 border-purple-200',
    label: 'Residuos',
    icon: '♻️'
  },
  GENERAL: {
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    label: 'General',
    icon: '🌱'
  },
  BONUS: {
    color: 'text-orange-600',
    bgColor: 'bg-orange-50 border-orange-200',
    label: 'Bonus',
    icon: '⭐'
  }
};

const difficultyConfig: Record<MissionDifficulty, { color: string; label: string; stars: string }> = {
  EASY: { color: 'text-green-600', label: 'Fácil', stars: '★☆☆' },
  MEDIUM: { color: 'text-yellow-600', label: 'Media', stars: '★★☆' },
  HARD: { color: 'text-red-600', label: 'Difícil', stars: '★★★' }
};

const statusConfig: Record<MissionStatus, { color: string; bgColor: string; label: string }> = {
  ACTIVE: { color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'En Progreso' },
  COMPLETED: { color: 'text-green-600', bgColor: 'bg-green-100', label: 'Completada' },
  EXPIRED: { color: 'text-gray-500', bgColor: 'bg-gray-100', label: 'Expirada' },
  FAILED: { color: 'text-red-600', bgColor: 'bg-red-100', label: 'Fallida' }
};

export default function MissionCard({
  mission,
  progress,
  onAccept,
  onComplete,
  compact = false
}: MissionCardProps) {
  const [loading, setLoading] = useState(false);
  const category = categoryConfig[mission.category];
  const difficulty = difficultyConfig[mission.difficulty];
  const status = progress ? statusConfig[progress.status] : null;

  const isActive = progress?.status === 'ACTIVE';
  const isCompleted = progress?.status === 'COMPLETED';
  const canAccept = !progress && onAccept;
  const canComplete = isActive && progress.completionPercent >= 100 && onComplete;

  const handleAction = async () => {
    if (loading) return;

    setLoading(true);
    try {
      if (canAccept) {
        await onAccept(mission.id);
      } else if (canComplete) {
        await onComplete(mission.id);
      }
    } catch (error) {
      console.error('Error en acción de misión:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
  };

  const getDaysRemaining = () => {
    if (!progress) return null;
    const now = new Date();
    const expires = new Date(progress.expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const daysRemaining = getDaysRemaining();

  if (compact) {
    return (
      <div className={`p-3 rounded-lg border ${category.bgColor} transition-all hover:shadow-md`}>
        <div className="flex items-center gap-3">
          <span className="text-2xl">{mission.iconEmoji || category.icon}</span>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-gray-800 truncate">
              {mission.title}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-xs ${difficulty.color}`}>
                {difficulty.stars}
              </span>
              <span className="text-xs font-medium text-gray-700">
                +{mission.xpReward} XP
              </span>
              {status && (
                <span className={`text-xs px-2 py-0.5 rounded ${status.bgColor} ${status.color}`}>
                  {status.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {progress && isActive && (
          <div className="mt-2">
            <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
              <span>Progreso</span>
              <span className="font-semibold">{Math.min(100, progress.completionPercent).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  progress.completionPercent >= 100 ? 'bg-green-500' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(100, progress.completionPercent)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`
      relative p-5 rounded-xl border-2 transition-all hover:shadow-lg
      ${category.bgColor}
      ${isCompleted ? 'opacity-90' : ''}
    `}>
      {/* Badges superiores */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-1 rounded ${category.bgColor} ${category.color} border ${category.color.replace('text-', 'border-')}`}>
            {category.icon} {category.label}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded bg-white ${difficulty.color}`}>
            {difficulty.stars} {difficulty.label}
          </span>
        </div>
        {status && (
          <span className={`text-xs font-semibold px-2 py-1 rounded ${status.bgColor} ${status.color}`}>
            {status.label}
          </span>
        )}
      </div>

      {/* Contenido principal */}
      <div className="flex gap-4">
        <span className="text-4xl flex-shrink-0">
          {mission.iconEmoji || category.icon}
        </span>

        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {mission.title}
          </h3>

          <p className="text-sm text-gray-700 mb-4 leading-relaxed">
            {mission.description}
          </p>

          {/* Detalles de objetivo */}
          {mission.targetValue && (
            <div className="mb-4 p-3 bg-white/50 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Objetivo:</span>
                <span className="font-semibold text-gray-800">
                  {progress ?
                    `${progress.currentProgress} / ${progress.targetValue}` :
                    mission.targetValue
                  } {mission.targetUnit || ''}
                </span>
              </div>
            </div>
          )}

          {/* Barra de progreso */}
          {progress && isActive && (
            <div className="mb-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1.5">
                <span className="font-medium">Tu progreso</span>
                <span className="font-bold">
                  {Math.min(100, progress.completionPercent).toFixed(0)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                <div
                  className={`
                    h-3 rounded-full transition-all duration-500
                    ${progress.completionPercent >= 100 ? 'bg-gradient-to-r from-green-400 to-green-600' : 'bg-gradient-to-r from-blue-400 to-blue-600'}
                  `}
                  style={{ width: `${Math.min(100, progress.completionPercent)}%` }}
                />
              </div>
              {progress.completionPercent >= 100 && (
                <p className="text-xs text-green-600 font-semibold mt-1">
                  ¡Objetivo completado! 🎉
                </p>
              )}
            </div>
          )}

          {/* Footer con información adicional */}
          <div className="flex items-center justify-between pt-3 border-t border-gray-200">
            <div className="flex items-center gap-3 text-xs text-gray-600">
              {daysRemaining !== null && isActive && (
                <span className={`
                  font-medium px-2 py-1 rounded
                  ${daysRemaining <= 1 ? 'bg-red-100 text-red-700' :
                    daysRemaining <= 3 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'}
                `}>
                  ⏰ {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'}
                </span>
              )}
              {!progress && (
                <span className="text-gray-500">
                  📅 {formatDate(mission.startDate)} - {formatDate(mission.endDate)}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-green-600">
                +{mission.xpReward} XP
              </span>
            </div>
          </div>

          {/* Botón de acción */}
          {(canAccept || canComplete) && (
            <button
              onClick={handleAction}
              disabled={loading}
              className={`
                w-full mt-4 px-4 py-2.5 rounded-lg font-semibold transition-all
                ${canComplete ?
                  'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700' :
                  'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
                shadow-lg hover:shadow-xl
              `}
            >
              {loading ? (
                <span>Procesando...</span>
              ) : canComplete ? (
                <span>¡Completar Misión! 🎯</span>
              ) : (
                <span>Aceptar Misión 🚀</span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Badge de completada */}
      {isCompleted && (
        <div className="absolute top-3 right-3 bg-green-500 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-lg">
          <span className="text-xl">✓</span>
        </div>
      )}
    </div>
  );
}
