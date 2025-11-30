'use client';

import { useState, useEffect } from 'react';
import type { XPBalance, StreakInfo } from '@/types/gamification';
import { api } from '@/lib/api-client';

interface GamificationProfileProps {
  userId?: string;
  compact?: boolean;
  showDetails?: boolean;
}

export default function GamificationProfile({
  userId,
  compact = false,
  showDetails = true
}: GamificationProfileProps) {
  const [xpData, setXpData] = useState<XPBalance | null>(null);
  const [streakData, setStreakData] = useState<StreakInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);

        // Obtener balance de XP
        const xpResponse = await api<XPBalance>('/gam/xp-balance', {
          method: 'GET'
        });
        setXpData(xpResponse);

        // Obtener streaks
        const streakResponse = await api<StreakInfo>('/gam/streaks', {
          method: 'GET'
        });
        setStreakData(streakResponse);

      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Error al cargar perfil';
        setError(errorMessage);
        console.error('Error al cargar perfil de gamificación:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [userId]);

  const getLevelTitle = (level: number): string => {
    if (level <= 2) return 'Eco-Aprendiz';
    if (level <= 5) return 'Guardián Verde';
    if (level <= 9) return 'Héroe Sostenible';
    if (level <= 15) return 'Campeón del Planeta';
    return 'Leyenda Ecológica';
  };

  const getLevelColor = (level: number): string => {
    if (level <= 2) return 'from-green-400 to-green-600';
    if (level <= 5) return 'from-blue-400 to-blue-600';
    if (level <= 9) return 'from-purple-400 to-purple-600';
    if (level <= 15) return 'from-orange-400 to-orange-600';
    return 'from-yellow-400 to-pink-500';
  };

  const getLevelEmoji = (level: number): string => {
    if (level <= 2) return '🌱';
    if (level <= 5) return '🛡️';
    if (level <= 9) return '⚡';
    if (level <= 15) return '🏆';
    return '👑';
  };

  const getStreakEmoji = (streak: number): string => {
    if (streak === 0) return '💤';
    if (streak <= 2) return '🔥';
    if (streak <= 4) return '🔥🔥';
    if (streak <= 7) return '🔥🔥🔥';
    return '🚀';
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border-2 border-red-200 p-6">
        <div className="text-center py-6">
          <span className="text-3xl mb-3 block">⚠️</span>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!xpData) {
    return null;
  }

  const xpProgress = ((xpData.totalXp % Math.pow(xpData.currentLevel + 1, 2) * 100) / xpData.xpToNextLevel) * 100;
  const levelTitle = getLevelTitle(xpData.currentLevel);
  const levelColor = getLevelColor(xpData.currentLevel);
  const levelEmoji = getLevelEmoji(xpData.currentLevel);
  const streakEmoji = getStreakEmoji(streakData?.currentStreak || 0);

  if (compact) {
    return (
      <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl border-2 border-green-200 p-4">
        <div className="flex items-center gap-4">
          {/* Nivel */}
          <div className={`
            w-16 h-16 rounded-full bg-gradient-to-br ${levelColor}
            flex flex-col items-center justify-center text-white shadow-lg
          `}>
            <span className="text-xl">{levelEmoji}</span>
            <span className="text-xs font-bold">{xpData.currentLevel}</span>
          </div>

          {/* Info rápida */}
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-gray-800 text-sm truncate">
              {levelTitle}
            </h3>
            <p className="text-xs text-gray-600 mb-1">
              {xpData.totalXp.toLocaleString()} XP
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-orange-600 font-semibold">
                {streakEmoji} {streakData?.currentStreak || 0}
              </span>
              <span className="text-gray-400">•</span>
              <span className="text-green-600 font-semibold">
                +{xpData.xpThisMonth} XP mes
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
      {/* Header con gradiente */}
      <div className={`
        bg-gradient-to-br ${levelColor} p-6 text-white relative overflow-hidden
      `}>
        {/* Patrón de fondo */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '20px 20px'
          }} />
        </div>

        {/* Contenido */}
        <div className="relative">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex flex-col items-center justify-center border-4 border-white/40 shadow-xl">
              <span className="text-4xl">{levelEmoji}</span>
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-1">
                Nivel {xpData.currentLevel}
              </h2>
              <p className="text-sm opacity-90 font-medium">
                {levelTitle}
              </p>
            </div>
          </div>

          {/* Barra de progreso al siguiente nivel */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-medium opacity-90">
                {xpData.totalXp.toLocaleString()} XP
              </span>
              <span className="font-bold">
                {xpData.xpToNextLevel} XP para nivel {xpData.currentLevel + 1}
              </span>
            </div>
            <div className="w-full bg-white/30 rounded-full h-3 overflow-hidden backdrop-blur-sm">
              <div
                className="h-3 bg-white rounded-full transition-all duration-500 shadow-lg"
                style={{ width: `${Math.min(100, xpProgress)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas detalladas */}
      {showDetails && (
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4">
            {/* Streak actual */}
            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-lg p-4 border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">{streakEmoji}</span>
                <span className="text-xs font-semibold text-gray-600">RACHA ACTUAL</span>
              </div>
              <p className="text-2xl font-bold text-orange-600">
                {streakData?.currentStreak || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                {streakData?.currentStreak === 1 ? 'semana' : 'semanas'} consecutivas
              </p>
            </div>

            {/* Mejor racha */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">🏅</span>
                <span className="text-xs font-semibold text-gray-600">MEJOR RACHA</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">
                {streakData?.bestStreak || 0}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                récord personal
              </p>
            </div>

            {/* XP este mes */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">📈</span>
                <span className="text-xs font-semibold text-gray-600">XP ESTE MES</span>
              </div>
              <p className="text-2xl font-bold text-green-600">
                +{xpData.xpThisMonth.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                experiencia ganada
              </p>
            </div>

            {/* XP Total */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-2xl">⭐</span>
                <span className="text-xs font-semibold text-gray-600">XP TOTAL</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">
                {xpData.totalXp.toLocaleString()}
              </p>
              <p className="text-xs text-gray-600 mt-1">
                experiencia acumulada
              </p>
            </div>
          </div>

          {/* Tips para el siguiente nivel */}
          <div className="mt-4 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
            <div className="flex items-start gap-3">
              <span className="text-2xl">💡</span>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-800 mb-1 text-sm">
                  Consejos para subir de nivel
                </h4>
                <ul className="text-xs text-gray-600 space-y-1">
                  <li>• Completa misiones semanales para ganar XP</li>
                  <li>• Mantén tu racha de cálculos activa</li>
                  <li>• Registra tus actividades diarias</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer con última actualización */}
      <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
        <p className="text-xs text-gray-500 text-center">
          Actualizado: {new Date(xpData.updatedAt).toLocaleDateString('es-CL', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </p>
      </div>
    </div>
  );
}
