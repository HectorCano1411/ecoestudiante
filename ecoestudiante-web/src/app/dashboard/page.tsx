'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useUser } from '@auth0/nextjs-auth0/client';
import DashboardMenu from '@/components/DashboardMenu';
import ElectricityForm from '@/components/ElectricityForm';
import TransportForm from '@/components/TransportForm';
import WasteForm from '@/components/WasteForm';
import { GamificationProfile, Leaderboard, MissionCard } from '@/components/gamification';
import { api } from '@/lib/api-client';
import type { StatsSummary } from '@/types/calc';
import type { XPBalance, Mission, MissionProgress, MissionStatus } from '@/types/gamification';

export default function DashboardPage() {
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'menu' | 'electricity' | 'transport' | 'waste' | 'missions' | 'leaderboard'>('menu');
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [authMethod, setAuthMethod] = useState<'jwt' | 'auth0' | null>(null);
  const [xpBalance, setXpBalance] = useState<XPBalance | null>(null);
  const [activeMissions, setActiveMissions] = useState<Array<{ mission: Mission; progress: MissionProgress }>>([]);
  const [availableMissions, setAvailableMissions] = useState<Mission[]>([]);
  const [completedMissions, setCompletedMissions] = useState<Array<{ mission: Mission; progress: MissionProgress }>>([]);
  const [loadingMissions, setLoadingMissions] = useState(false);

  // Tipo para la respuesta del backend que incluye mission dentro de progress
  interface MissionProgressWithMission {
    id: number;
    missionId: number;
    mission: Mission;
    status: string;
    currentProgress: number;
    targetProgress: number;
    completionPercentage: number;
    startedAt?: string;
    completedAt?: string;
    expiresAt?: string;
    baselineValue?: number;
    statusLabel?: string;
  }

  useEffect(() => {
    // ========================================================================
    // SOLUCIÓN EXPERTA: AUTH VALIDATION SIMPLIFICADA
    // ========================================================================
    // Verificar JWT primero (más rápido), luego confiar en Auth0 hook
    // Si el backend responde 401, el interceptor redirigirá automáticamente.

    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('username');

    if (token && user) {
      // JWT tradicional encontrado
      setUsername(user);
      setAuthMethod('jwt');
      setLoading(false);
      return;
    }

    // Esperar a que Auth0 termine de cargar
    if (auth0Loading) {
      return;
    }

    // Si Auth0 cargó y hay usuario, usar sus datos
    if (auth0User) {
      setUsername(auth0User.name || auth0User.email || 'Usuario');
      setAuthMethod('auth0');
      setLoading(false);
      return;
    }

    // Si no hay ninguna sesión, dejar que el componente se cargue
    // El backend responderá 401 y el interceptor manejará el redirect
    setLoading(false);
  }, [auth0User, auth0Loading]);

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const data = await api<StatsSummary>('/stats/summary');
      setStats(data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  const loadGamificationData = useCallback(async () => {
    try {
      setLoadingMissions(true);
      
      // Cargar XP balance
      const xpData = await api<XPBalance>('/gam/xp-balance', { method: 'GET' });
      setXpBalance(xpData);

      // Cargar misiones disponibles (no aceptadas)
      try {
        const availableData = await api<{ missions?: Mission[] }>('/gam/missions/available', { method: 'GET' });
        setAvailableMissions(availableData.missions || []);
      } catch (error) {
        console.error('Error cargando misiones disponibles:', error);
        setAvailableMissions([]);
      }

      // Cargar progreso de misiones (activas, completadas, expiradas)
      // El backend devuelve: { active: [], completed: [], expired: [] }
      // Cada elemento es MissionProgressResponse que incluye: { id, missionId, mission: {...}, status, currentProgress, ... }
      const missionsData = await api<{
        active?: MissionProgressWithMission[];
        completed?: MissionProgressWithMission[];
        expired?: MissionProgressWithMission[];
      }>('/gam/missions/my-progress', { method: 'GET' });
      
      // Convertir al formato que espera el componente MissionCard
      setActiveMissions((missionsData.active || []).map((item: MissionProgressWithMission) => ({
        mission: item.mission,
        progress: {
          id: item.id,
          missionId: item.missionId,
          userId: 0,
          status: item.status as MissionStatus,
          currentProgress: item.currentProgress || 0,
          targetValue: item.targetProgress || item.mission.targetValue || 0,
          completionPercent: item.completionPercentage || 0,
          startedAt: item.startedAt || new Date().toISOString(),
          completedAt: item.completedAt,
          expiresAt: item.completedAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 días desde ahora
        } as MissionProgress
      })));
      
      setCompletedMissions((missionsData.completed || []).map((item: MissionProgressWithMission) => ({
        mission: item.mission,
        progress: {
          id: item.id,
          missionId: item.missionId,
          userId: 0,
          status: item.status as MissionStatus,
          currentProgress: item.currentProgress || 0,
          targetValue: item.targetProgress || item.mission.targetValue || 0,
          completionPercent: item.completionPercentage || 100,
          startedAt: item.startedAt || new Date().toISOString(),
          completedAt: item.completedAt || new Date().toISOString(),
          expiresAt: item.completedAt || new Date().toISOString(),
        } as MissionProgress
      })));
    } catch (error) {
      console.error('Error cargando datos de gamificación:', error);
    } finally {
      setLoadingMissions(false);
    }
  }, []);

  const handleCalculationSuccess = useCallback(async () => {
    // Recargar estadísticas
    await loadStats();
    
    // Verificar y actualizar misiones después de un cálculo
    try {
      await api('/gam/missions/check', { method: 'POST' });
      console.log('Misiones verificadas y actualizadas');
    } catch (error) {
      console.error('Error verificando misiones:', error);
    }
    
    // Recargar datos de gamificación para ver el progreso actualizado
    await loadGamificationData();
  }, [loadStats, loadGamificationData]);

  const handleAcceptMission = async (missionId: number) => {
    try {
      await api(`/gam/missions/${missionId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ missionId })
      });
      // Recargar todos los datos de gamificación
      await loadGamificationData();
      alert('¡Misión aceptada con éxito! 🚀');
    } catch (error) {
      console.error('Error al aceptar misión:', error);
      alert('Error al aceptar la misión. Intenta nuevamente.');
    }
  };

  const handleCompleteMission = async (missionId: number) => {
    try {
      await api(`/gam/missions/${missionId}/complete`, {
        method: 'POST'
      });
      loadGamificationData();
      loadStats(); // Recargar stats también
      alert('¡Misión completada! 🎉 XP otorgado.');
    } catch (error) {
      console.error('Error al completar misión:', error);
    }
  };

  useEffect(() => {
    // Cargar estadísticas cuando se muestra el menú
    if (activeSection === 'menu' && !loading && authMethod) {
      loadStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, loading, authMethod]);

  useEffect(() => {
    // Cargar datos de gamificación cuando el usuario esté autenticado
    if (!loading && authMethod) {
      loadGamificationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, authMethod]);

  useEffect(() => {
    // Recargar misiones cuando se cambia a la sección de misiones
    if (activeSection === 'missions' && !loading && authMethod) {
      loadGamificationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, loading, authMethod]);

  const handleLogout = () => {
    if (authMethod === 'auth0') {
      // Logout de Auth0
      window.location.href = '/api/auth/logout';
    } else {
      // Logout JWT tradicional
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      // Usar window.location.href para evitar problemas con RSC
      window.location.href = '/login';
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">E</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">EcoEstudiante</h1>
            </div>
            <div className="flex items-center gap-4">
              {/* Widget de XP/Nivel */}
              {xpBalance && (
                <div
                  className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-200 cursor-pointer hover:shadow-md transition-all"
                  onClick={() => setActiveSection('missions')}
                  title="Ver perfil de gamificación"
                >
                  <span className="text-xl">
                    {xpBalance.currentLevel <= 2 ? '🌱' :
                     xpBalance.currentLevel <= 5 ? '🛡️' :
                     xpBalance.currentLevel <= 9 ? '⚡' :
                     xpBalance.currentLevel <= 15 ? '🏆' : '👑'}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-700 leading-tight">
                      Nivel {xpBalance.currentLevel}
                    </p>
                    <p className="text-xs text-gray-600 leading-tight">
                      {xpBalance.totalXp} XP
                    </p>
                  </div>
                </div>
              )}

              <button
                onClick={() => setActiveSection('missions')}
                className="px-4 py-2 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
              >
                🎯 Misiones
                {activeMissions.length > 0 && (
                  <span className="bg-white text-green-600 text-xs font-bold px-2 py-0.5 rounded-full">
                    {activeMissions.length}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveSection('leaderboard')}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                🏆 Ranking
              </button>

              <Link href="/analytics" prefetch={false}>
                <button className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors">
                  📊 Análisis
                </button>
              </Link>

              <Link href="/history" prefetch={false}>
                <button className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
                  📜 Historial
                </button>
              </Link>

              <div className="text-right border-l border-gray-200 pl-4">
                <p className="text-sm font-medium text-gray-800">{username}</p>
                <p className="text-xs text-gray-500">Sesión activa</p>
              </div>

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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          {activeSection !== 'menu' && (
            <button
              onClick={() => setActiveSection('menu')}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <span>←</span> Volver al menú
            </button>
          )}
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {activeSection === 'menu'
              ? 'Mi Huella de Carbono'
              : activeSection === 'missions'
              ? '🎯 Misiones Verdes'
              : activeSection === 'leaderboard'
              ? '🏆 Ranking Semanal'
              : activeSection === 'electricity'
              ? 'Registrar Consumo Eléctrico'
              : activeSection === 'transport'
              ? 'Registrar Transporte'
              : 'Registrar Residuos'}
          </h2>
          <p className="text-gray-600">
            {activeSection === 'menu'
              ? 'Selecciona una categoría para registrar tu huella de carbono'
              : activeSection === 'missions'
              ? 'Completa misiones para ganar XP y reducir tu huella de carbono'
              : activeSection === 'leaderboard'
              ? 'Compite con otros estudiantes por reducir emisiones de CO₂'
              : activeSection === 'electricity'
              ? 'Ingresa los datos de tu consumo eléctrico mensual'
              : activeSection === 'transport'
              ? 'Registra tus viajes y calcula las emisiones de transporte'
              : 'Registra tu generación de residuos semanal'}
          </p>
        </div>

        {/* Content */}
        {activeSection === 'menu' ? (
          <div>
            <DashboardMenu onItemClick={(itemId) => {
              if (itemId === 'electricity') setActiveSection('electricity');
              if (itemId === 'transport') setActiveSection('transport');
              if (itemId === 'waste') setActiveSection('waste');
            }} />
            <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Comienza Ahora
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-green-200 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => setActiveSection('electricity')}
                >
                  <div className="w-12 h-12 bg-yellow-500 text-white text-2xl rounded-lg flex items-center justify-center">
                    ⚡
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-800">Registrar Consumo Eléctrico</h4>
                    <p className="text-sm text-gray-600">Comienza registrando tu consumo eléctrico mensual</p>
                  </div>
                  <span className="text-green-600 font-medium text-xl">→</span>
                </div>
                <div 
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setActiveSection('transport')}
                >
                  <div className="w-12 h-12 bg-blue-500 text-white text-2xl rounded-lg flex items-center justify-center">
                    🚗
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-800">Registrar Transporte</h4>
                    <p className="text-sm text-gray-600">Registra tus viajes y calcula emisiones de movilidad</p>
                  </div>
                  <span className="text-blue-600 font-medium text-xl">→</span>
                </div>
                <div
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-purple-200 bg-purple-50 cursor-pointer hover:bg-purple-100 transition-colors"
                  onClick={() => setActiveSection('waste')}
                >
                  <div className="w-12 h-12 bg-purple-600 text-white text-2xl rounded-lg flex items-center justify-center">
                    🗑️
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-800">Registrar Residuos</h4>
                    <p className="text-sm text-gray-600">Calcula emisiones de tu generación de residuos</p>
                  </div>
                  <span className="text-purple-600 font-medium text-xl">→</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeSection === 'electricity' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500 text-white text-xl rounded-lg flex items-center justify-center">
                  ⚡
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Registrar Consumo Eléctrico</h3>
              </div>
              <p className="text-sm text-gray-600 ml-14">
                Calcula tu huella de carbono basada en tu consumo eléctrico mensual
              </p>
            </div>
            
            <ElectricityForm onSuccess={handleCalculationSuccess} />
          </div>
        ) : activeSection === 'transport' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500 text-white text-xl rounded-lg flex items-center justify-center">
                  🚗
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Registrar Transporte</h3>
              </div>
              <p className="text-sm text-gray-600 ml-14">
                Selecciona origen y destino en el mapa o ingresa la distancia manualmente
              </p>
            </div>

            <TransportForm onSuccess={handleCalculationSuccess} />
          </div>
        ) : activeSection === 'waste' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-600 text-white text-xl rounded-lg flex items-center justify-center">
                  🗑️
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Registrar Residuos</h3>
              </div>
              <p className="text-sm text-gray-600 ml-14">
                Ingresa el peso semanal de residuos que generas por tipo
              </p>
            </div>

            <WasteForm onSuccess={handleCalculationSuccess} />
          </div>
        ) : activeSection === 'missions' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Columna izquierda - Perfil */}
            <div className="lg:col-span-1">
              <GamificationProfile showDetails={true} />
            </div>

            {/* Columna derecha - Misiones */}
            <div className="lg:col-span-2 space-y-6">
              {loadingMissions ? (
                <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-green-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Cargando misiones...</p>
                </div>
              ) : (
                <>
                  {/* Misiones Disponibles */}
                  {availableMissions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">
                        ⭐ Misiones Disponibles ({availableMissions.length})
                      </h3>
                      <div className="space-y-4">
                        {availableMissions.map((mission) => (
                          <MissionCard
                            key={mission.id}
                            mission={mission}
                            onAccept={handleAcceptMission}
                            compact={false}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Misiones Activas */}
                  {activeMissions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">
                        🎯 Misiones Activas ({activeMissions.length})
                      </h3>
                      <div className="space-y-4">
                        {activeMissions.map((item) => (
                          <MissionCard
                            key={item.mission.id}
                            mission={item.mission}
                            progress={item.progress}
                            onComplete={handleCompleteMission}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Misiones Completadas */}
                  {completedMissions.length > 0 && (
                    <div>
                      <h3 className="text-xl font-bold text-gray-800 mb-4">
                        ✅ Misiones Completadas ({completedMissions.length})
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {completedMissions.map((item) => (
                          <MissionCard
                            key={item.mission.id}
                            mission={item.mission}
                            progress={item.progress}
                            compact={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Mensaje si no hay misiones */}
                  {availableMissions.length === 0 && activeMissions.length === 0 && completedMissions.length === 0 && (
                    <div className="bg-white rounded-xl border-2 border-gray-200 p-12 text-center">
                      <span className="text-6xl mb-4 block">🎯</span>
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        No tienes misiones activas
                      </h3>
                      <p className="text-gray-600 mb-4">
                        Completa cálculos de huella de carbono para desbloquear misiones
                      </p>
                      <button
                        onClick={() => setActiveSection('menu')}
                        className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                      >
                        Ir a Calcular
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        ) : activeSection === 'leaderboard' ? (
          <div>
            <Leaderboard topN={20} showWeekSelector={true} />
          </div>
        ) : null}

        {/* Stats Card */}
        {activeSection === 'menu' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Registros Totales</p>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-800">
                      {stats?.totalRecords ?? 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Huella Total</p>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.totalKgCO2e.toFixed(2) ?? '0.00'} kg CO₂e
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Este Mes</p>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.thisMonthKgCO2e.toFixed(2) ?? '0.00'} kg CO₂e
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
