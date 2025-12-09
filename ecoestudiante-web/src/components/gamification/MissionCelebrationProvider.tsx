'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useCompletedMissions } from '@/lib/hooks';
import MissionCompletedCelebration from './MissionCompletedCelebration';

/**
 * Provider global que detecta automaticamente cuando se completa una mision
 * y muestra la celebracion correspondiente.
 *
 * Debe ser incluido en el layout principal de la aplicacion.
 */
export default function MissionCelebrationProvider({
  children
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useUser();

  // Solo activar el hook si el usuario esta autenticado
  const completedMission = useCompletedMissions(
    !isLoading && !!user,
    5000 // Check cada 5 segundos
  );

  return (
    <>
      {children}

      {/* Modal de celebracion */}
      {completedMission && (
        <MissionCompletedCelebration
          mission={completedMission.mission}
          xpEarned={completedMission.xpEarned}
          onClose={() => {
            // El hook maneja el clear automaticamente
          }}
        />
      )}
    </>
  );
}
