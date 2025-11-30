'use client';

/**
 * PÁGINA DE DEMOSTRACIÓN - Módulo de Gamificación
 *
 * Esta página muestra cómo integrar los componentes de gamificación
 * en el dashboard de EcoEstudiante.
 *
 * Componentes disponibles:
 * - GamificationProfile: Muestra nivel, XP, streak del usuario
 * - Leaderboard: Ranking semanal de usuarios
 * - MissionCard: Tarjeta individual de misión
 *
 * Para producción, estos componentes deben integrarse en /dashboard
 */

import { useState, useEffect } from 'react';
import { GamificationProfile, Leaderboard, MissionCard } from '@/components/gamification';
import { api } from '@/lib/api-client';
import type { Mission, MissionProgress } from '@/types/gamification';

export default function GamificationDemoPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [myProgress, setMyProgress] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener misiones disponibles
        const missionsData = await api<any>('/gam/missions', { method: 'GET' });
        setMissions(missionsData.missions || []);

        // Obtener mi progreso
        const progressData = await api<any>('/gam/missions/my-progress', { method: 'GET' });
        setMyProgress(progressData);
      } catch (error) {
        console.error('Error al cargar datos de gamificación:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleAcceptMission = async (missionId: number) => {
    try {
      await api(`/gam/missions/${missionId}/assign`, {
        method: 'POST',
        body: JSON.stringify({ missionId })
      });

      // Recargar datos
      const progressData = await api<any>('/gam/missions/my-progress', { method: 'GET' });
      setMyProgress(progressData);

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

      // Recargar datos
      const progressData = await api<any>('/gam/missions/my-progress', { method: 'GET' });
      setMyProgress(progressData);

      alert('¡Misión completada! 🎉 XP otorgado.');
    } catch (error) {
      console.error('Error al completar misión:', error);
      alert('Error al completar la misión.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600 mx-auto mb-4"></div>
              <p className="text-gray-600 text-lg">Cargando gamificación...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-green-200">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            🎮 Módulo de Gamificación
          </h1>
          <p className="text-gray-600">
            Demo de integración de componentes de gamificación para EcoEstudiante
          </p>
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>Página de demostración</strong> - Para producción, integrar estos componentes en <code className="bg-yellow-100 px-2 py-1 rounded">/dashboard</code>
            </p>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Columna Izquierda - Perfil de Gamificación */}
          <div className="lg:col-span-1 space-y-6">
            <h2 className="text-2xl font-bold text-gray-800">Tu Perfil</h2>
            <GamificationProfile showDetails={true} />
          </div>

          {/* Columna Central - Misiones */}
          <div className="lg:col-span-2 space-y-6">

            {/* Misiones Activas */}
            {myProgress?.activeMissions && myProgress.activeMissions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  🎯 Misiones Activas ({myProgress.totalActive})
                </h2>
                <div className="space-y-4">
                  {myProgress.activeMissions.slice(0, 3).map((item: any) => (
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

            {/* Misiones Disponibles */}
            {missions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  ⭐ Misiones Disponibles
                </h2>
                <div className="space-y-4">
                  {missions.slice(0, 3).map((mission) => (
                    <MissionCard
                      key={mission.id}
                      mission={mission}
                      onAccept={handleAcceptMission}
                      compact={true}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Misiones Completadas */}
            {myProgress?.completedMissions && myProgress.completedMissions.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  ✅ Completadas ({myProgress.totalCompleted})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myProgress.completedMissions.slice(0, 4).map((item: any) => (
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
          </div>
        </div>

        {/* Leaderboard - Ancho Completo */}
        <div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            🏆 Ranking Semanal
          </h2>
          <Leaderboard topN={10} showWeekSelector={true} />
        </div>

        {/* Ejemplo de uso compacto */}
        <div className="bg-white rounded-xl shadow-lg p-6 border-2 border-blue-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            💡 Ejemplos de Integración
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">1. Perfil Compacto (para sidebar)</h3>
              <GamificationProfile compact={true} />
            </div>

            <div>
              <h3 className="font-semibold text-gray-700 mb-2">2. Leaderboard Compacto (para widget)</h3>
              <Leaderboard topN={5} showWeekSelector={false} compact={true} />
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-semibold text-gray-700 mb-2">Código de ejemplo:</h3>
            <pre className="text-xs bg-gray-800 text-green-400 p-4 rounded overflow-x-auto">
{`import { GamificationProfile, Leaderboard, MissionCard } from '@/components/gamification';

// En tu dashboard:
<GamificationProfile compact={true} />
<Leaderboard topN={10} autoRefresh={true} />
<MissionCard
  mission={mission}
  progress={progress}
  onAccept={handleAccept}
  onComplete={handleComplete}
/>`}
            </pre>
          </div>
        </div>

      </div>
    </div>
  );
}
