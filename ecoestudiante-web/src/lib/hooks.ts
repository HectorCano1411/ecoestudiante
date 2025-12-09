import { useEffect, useState, useRef, useCallback } from 'react';
import type { Mission } from '@/types/gamification';

interface CompletedMissionEvent {
  mission: Mission;
  xpEarned: number;
  completedAt: string;
}

/**
 * Hook personalizado que detecta automaticamente cuando se completa una mision.
 * Usa polling para verificar el estado de las misiones del usuario.
 *
 * @param enabled - Si el hook debe estar activo
 * @param pollInterval - Intervalo en milisegundos para hacer polling (default: 5000ms)
 * @returns {CompletedMissionEvent | null} - Datos de la mision completada o null
 */
export function useCompletedMissions(enabled: boolean = true, pollInterval: number = 5000) {
  const [completedMission, setCompletedMission] = useState<CompletedMissionEvent | null>(null);
  const lastCheckRef = useRef<Set<number>>(new Set());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const checkForCompletedMissions = useCallback(async () => {
    try {
      // Llamar al endpoint que devuelve misiones del usuario
      const response = await fetch('/api/gam/missions/my-progress', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        console.warn('[Mission Hook] API response not OK:', response.status);
        return;
      }

      const data = await response.json();

      // ✅ FIX: El backend devuelve un objeto con estructura:
      // { active: [...], completed: [...], expired: [...], totalActive: N, totalCompleted: N }
      // NO es un array plano, sino un objeto con propiedades

      if (!data || typeof data !== 'object') {
        console.warn('[Mission Hook] Invalid data structure received:', data);
        return;
      }

      // Acceder a las misiones completadas desde la propiedad correcta
      const completedMissions = data.completed || [];

      // Debug: mostrar misiones completadas
      if (completedMissions.length > 0) {
        console.log('[Mission Hook] Misiones completadas encontradas:', completedMissions.length);
        completedMissions.forEach((m: any) => {
          const completedAt = new Date(m.completedAt);
          const now = new Date();
          const diffSeconds = (now.getTime() - completedAt.getTime()) / 1000;
          const alreadySeen = lastCheckRef.current.has(m.id);
          console.log(`[Mission Hook] ID: ${m.id}, Completada hace: ${Math.floor(diffSeconds)}s, Ya vista: ${alreadySeen}`);
        });
      }

      // Buscar misiones que acaban de completarse
      const recentlyCompleted = completedMissions.filter((progress: any) => {
        if (!lastCheckRef.current.has(progress.id)) {
          // Verificar si se completo recientemente (ultimos 5 minutos = 300 segundos)
          // Ventana amplia para asegurar que el usuario vea la celebracion
          if (progress.completedAt) {
            const completedAt = new Date(progress.completedAt);
            const now = new Date();
            const diffSeconds = (now.getTime() - completedAt.getTime()) / 1000;

            return diffSeconds <= 300;
          }
        }
        return false;
      });

      // Si hay una mision recien completada, notificar
      if (recentlyCompleted.length > 0) {
        const progress = recentlyCompleted[0]; // Tomar la primera
        lastCheckRef.current.add(progress.id);

        console.log('[Mission Hook] 🎉 Mostrando celebracion para mision:', {
          progressId: progress.id,
          missionId: progress.missionId,
          completedAt: progress.completedAt
        });

        // Obtener detalles completos de la mision
        const missionResponse = await fetch(`/api/gam/missions/${progress.missionId}`, {
          method: 'GET',
          credentials: 'include'
        });

        if (missionResponse.ok) {
          const mission = await missionResponse.json();

          setCompletedMission({
            mission: mission,
            xpEarned: mission.xpReward || 0,
            completedAt: progress.completedAt
          });

          console.log('[Mission Hook] ✅ Celebracion activada:', mission.title);

          // Limpiar despues de mostrar
          setTimeout(() => {
            setCompletedMission(null);
          }, 7000);
        } else {
          console.error('[Mission Hook] Error al obtener detalles de mision:', missionResponse.status);
        }
      }

      // Actualizar el set con todas las misiones completadas actuales
      completedMissions.forEach((progress: any) => {
        lastCheckRef.current.add(progress.id);
      });

      // Limpiar misiones antiguas del set (mantener solo las ultimas 50)
      if (lastCheckRef.current.size > 50) {
        const arr = Array.from(lastCheckRef.current);
        lastCheckRef.current = new Set(arr.slice(-50));
      }

    } catch (error) {
      console.error('[Mission Hook] Error checking completed missions:', error);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Hacer check inicial
    checkForCompletedMissions();

    // Configurar polling
    intervalRef.current = setInterval(checkForCompletedMissions, pollInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, pollInterval, checkForCompletedMissions]);

  return completedMission;
}

/**
 * Hook alternativo que escucha eventos de misiones completadas.
 * Este puede ser usado si el backend implementa Server-Sent Events o WebSockets.
 */
export function useMissionCompletedEvent() {
  const [completedMission, setCompletedMission] = useState<CompletedMissionEvent | null>(null);

  useEffect(() => {
    // Event listener para eventos custom
    const handleMissionCompleted = (event: CustomEvent<CompletedMissionEvent>) => {
      setCompletedMission(event.detail);

      // Auto-clear despues de 7 segundos
      setTimeout(() => {
        setCompletedMission(null);
      }, 7000);
    };

    window.addEventListener('missionCompleted' as any, handleMissionCompleted);

    return () => {
      window.removeEventListener('missionCompleted' as any, handleMissionCompleted);
    };
  }, []);

  return completedMission;
}
