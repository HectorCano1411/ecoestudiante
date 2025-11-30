'use client';

import { useState, useEffect, useCallback } from 'react';
import type { LeaderboardResponse, LeaderboardEntry } from '@/types/gamification';
import { api } from '@/lib/api-client';

interface LeaderboardProps {
  topN?: number;
  showWeekSelector?: boolean;
  compact?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number; // en segundos
}

export default function Leaderboard({
  topN = 10,
  showWeekSelector = true,
  compact = false,
  autoRefresh = false,
  refreshInterval = 60
}: LeaderboardProps) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedWeek, setSelectedWeek] = useState<string>('current');

  const fetchLeaderboard = useCallback(async () => {
    try {
      setError(null);
      const endpoint = selectedWeek === 'current'
        ? `/gam/leaderboard?topN=${topN}`
        : `/gam/leaderboard/week/${selectedWeek}?topN=${topN}`;

      const response = await api<LeaderboardResponse>(endpoint, {
        method: 'GET'
      });

      setData(response);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al cargar el leaderboard';
      setError(errorMessage);
      console.error('Error al cargar leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedWeek, topN]);

  useEffect(() => {
    fetchLeaderboard();

    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboard, refreshInterval * 1000);
      return () => clearInterval(interval);
    }
  }, [fetchLeaderboard, autoRefresh, refreshInterval]);

  const getMedalEmoji = (position: number): string => {
    switch (position) {
      case 1: return '🥇';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return '';
    }
  };

  const formatCO2 = (kg: number | undefined): string => {
    if (!kg && kg !== 0) return '0 kg';
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(2)} t`;
    }
    return `${kg.toFixed(2)} kg`;
  };

  const renderEntry = (entry: LeaderboardEntry, index: number, isCurrentUser: boolean = false) => {
    const medal = getMedalEmoji(entry.rankPosition);
    const bgColor = isCurrentUser
      ? 'bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-400'
      : entry.rankPosition <= 3
        ? 'bg-gradient-to-r from-yellow-50 to-orange-50'
        : 'bg-white';

    if (compact) {
      return (
        <div
          key={`${entry.userId}-${index}`}
          className={`flex items-center gap-3 p-2 rounded-lg ${bgColor} transition-all hover:shadow-md`}
        >
          <div className="flex items-center justify-center w-8 h-8 font-bold text-gray-700">
            {medal || `#${entry.rankPosition}`}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-800 truncate">
              {isCurrentUser ? '✨ ' : ''}{entry.username}
            </p>
            <p className="text-xs text-gray-600">
              {formatCO2(entry.co2AvoidedKg ?? 0)} CO₂ evitado
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-bold text-green-600">
              {(entry.totalXpWeek ?? 0).toLocaleString()} XP
            </p>
            <p className="text-xs text-gray-500">
              {entry.missionsCompleted ?? 0} misiones
            </p>
          </div>
        </div>
      );
    }

    return (
      <div
        key={`${entry.userId}-${index}`}
        className={`
          flex items-center gap-4 p-4 rounded-xl ${bgColor}
          transition-all hover:shadow-lg
          ${isCurrentUser ? 'ring-2 ring-green-500' : ''}
        `}
      >
        {/* Posición y medalla */}
        <div className={`
          flex items-center justify-center w-12 h-12 rounded-full font-bold text-lg
          ${entry.rankPosition === 1 ? 'bg-yellow-400 text-yellow-900' :
            entry.rankPosition === 2 ? 'bg-gray-300 text-gray-800' :
            entry.rankPosition === 3 ? 'bg-orange-400 text-orange-900' :
            'bg-gray-200 text-gray-700'}
        `}>
          {medal || entry.rankPosition}
        </div>

        {/* Información del usuario */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-bold text-gray-800 truncate">
              {isCurrentUser && <span className="text-green-600">✨ </span>}
              {entry.username}
            </h4>
            {isCurrentUser && (
              <span className="text-xs font-semibold bg-green-500 text-white px-2 py-0.5 rounded">
                TÚ
              </span>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">CO₂ evitado</p>
              <p className="font-bold text-green-600">
                {formatCO2(entry.co2AvoidedKg ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Misiones</p>
              <p className="font-semibold text-blue-600">
                {entry.missionsCompleted ?? 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">XP Semanal</p>
              <p className="font-semibold text-purple-600">
                {(entry.totalXpWeek ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Badge de top 3 */}
        {entry.rankPosition <= 3 && (
          <div className="text-3xl">
            {medal}
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando ranking...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border-2 border-red-200 p-6">
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">❌</span>
          <p className="text-red-600 font-semibold mb-2">Error al cargar el ranking</p>
          <p className="text-sm text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchLeaderboard}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="bg-white rounded-xl border-2 border-gray-200 p-6">
        <div className="text-center py-8">
          <span className="text-4xl mb-4 block">📊</span>
          <p className="text-gray-600">No hay datos disponibles</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-1">
              🏆 Ranking Semanal
            </h2>
            <p className="text-sm opacity-90">
              Semana {data.weekNumber ?? 'N/A'} • {data.year ?? new Date().getFullYear()}
            </p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{(data.totalUsers ?? 0).toLocaleString()}</p>
            <p className="text-xs opacity-90">participantes</p>
          </div>
        </div>

        {showWeekSelector && (
          <div className="mt-4">
            <select
              value={selectedWeek}
              onChange={(e) => setSelectedWeek(e.target.value)}
              className="w-full md:w-auto px-4 py-2 rounded-lg text-gray-800 font-medium focus:outline-none focus:ring-2 focus:ring-white"
            >
              <option value="current">Semana Actual</option>
              {/* Aquí se pueden agregar más semanas pasadas */}
            </select>
          </div>
        )}
      </div>

      {/* Top Users */}
      <div className="p-6">
        <h3 className="text-lg font-bold text-gray-800 mb-4">
          Top {topN} Eco-Héroes
        </h3>
        <div className="space-y-3">
          {data.topUsers.map((entry, index) => renderEntry(entry, index, entry.isCurrentUser))}
        </div>

        {data.topUsers.length === 0 && (
          <div className="text-center py-8">
            <span className="text-4xl mb-4 block">🌱</span>
            <p className="text-gray-600">
              Aún no hay participantes esta semana
            </p>
            <p className="text-sm text-gray-500 mt-2">
              ¡Sé el primero en completar una misión!
            </p>
          </div>
        )}
      </div>

      {/* Current User Position (si no está en el top) */}
      {data.currentUser && !data.topUsers.some(u => u.userId === data.currentUser?.userId) && (
        <div className="border-t-2 border-gray-200 p-6 bg-gray-50">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">
            Tu posición
          </h3>
          {renderEntry(data.currentUser, -1, true)}
        </div>
      )}

      {/* Footer con timestamp */}
      {data.calculatedAt && (
        <div className="border-t border-gray-200 px-6 py-3 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Última actualización: {new Date(data.calculatedAt).toLocaleString('es-CL')}
          </p>
        </div>
      )}
    </div>
  );
}
