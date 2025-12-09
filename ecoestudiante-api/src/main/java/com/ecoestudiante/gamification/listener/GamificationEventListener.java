package com.ecoestudiante.gamification.listener;

import com.ecoestudiante.gamification.event.CalculationCompletedEvent;
import com.ecoestudiante.gamification.event.MissionAssignedEvent;
import com.ecoestudiante.gamification.event.MissionCompletedEvent;
import com.ecoestudiante.gamification.service.LeaderboardService;
import com.ecoestudiante.gamification.service.MissionProgressService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Listener centralizado para eventos de gamificación.
 *
 * Responsabilidades:
 * - Escuchar eventos de cálculos completados
 * - Escuchar eventos de misiones completadas/asignadas
 * - Actualizar progreso de misiones automáticamente
 * - Actualizar leaderboard en tiempo real
 *
 * Usa @TransactionalEventListener para garantizar que solo se procesan
 * eventos de transacciones exitosas (AFTER_COMMIT).
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-12-08
 */
@Component
public class GamificationEventListener {

    private static final Logger logger = LoggerFactory.getLogger(GamificationEventListener.class);

    private final MissionProgressService missionProgressService;
    private final LeaderboardService leaderboardService;

    public GamificationEventListener(
            MissionProgressService missionProgressService,
            LeaderboardService leaderboardService
    ) {
        this.missionProgressService = missionProgressService;
        this.leaderboardService = leaderboardService;
    }

    /**
     * Escucha eventos de cálculos completados y actualiza misiones automáticamente.
     *
     * Se ejecuta DESPUÉS del commit de la transacción del cálculo para garantizar consistencia.
     * Es async para no bloquear el flujo principal de cálculo.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onCalculationCompleted(CalculationCompletedEvent event) {
        logger.info("🎮 Evento recibido: Cálculo completado - Usuario: {}, Categoría: {}, CO2: {} kg",
                event.getUserId(), event.getCategory(), event.getKgCO2e());

        try {
            // Actualizar progreso de misiones automáticamente
            int updatedMissions = missionProgressService.processCalculationAndUpdateMissions(event);

            if (updatedMissions > 0) {
                logger.info("✅ Actualizadas {} misiones para usuario {} tras cálculo de {}",
                        updatedMissions, event.getUserId(), event.getCategory());
            } else {
                logger.info("ℹ️ No se actualizaron misiones para usuario {} (sin misiones activas de categoría {})",
                        event.getUserId(), event.getCategory());
            }

            // ⚠️ CRÍTICO: SIEMPRE actualizar leaderboard después de un cálculo
            // independientemente de si hay misiones activas o no
            updateUserLeaderboard(event.getUserId());

        } catch (Exception e) {
            logger.error("❌ Error procesando cálculo para actualizar misiones - Usuario: {}",
                    event.getUserId(), e);
            // No propagar la excepción para no afectar el flujo principal
        }
    }

    /**
     * Escucha eventos de misiones completadas y actualiza leaderboard.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMissionCompleted(MissionCompletedEvent event) {
        logger.info("🏆 Evento recibido: Misión completada - Usuario: {}, Misión: '{}', XP: {}, CO2 Impact: {} kg",
                event.getUserId(), event.getMissionTitle(), event.getXpRewarded(), event.getCo2ImpactKg());

        try {
            // Actualizar leaderboard inmediatamente
            leaderboardService.updateUserLeaderboardEntry(
                    event.getUserId(),
                    event.getWeekNumber(),
                    event.getYear()
            );

            logger.info("✅ Leaderboard actualizado para usuario {} en semana {}-{}",
                    event.getUserId(), event.getWeekNumber(), event.getYear());
        } catch (Exception e) {
            logger.error("❌ Error actualizando leaderboard tras misión completada - Usuario: {}",
                    event.getUserId(), e);
        }
    }

    /**
     * Escucha eventos de misiones asignadas y actualiza leaderboard inmediatamente.
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onMissionAssigned(MissionAssignedEvent event) {
        logger.info("📝 Evento recibido: Misión asignada - Usuario: {}, Misión ID: {}, Semana: {}-{}",
                event.getUserId(), event.getMissionId(), event.getWeekNumber(), event.getYear());

        try {
            // Actualizar entrada del usuario en leaderboard
            // Esto asegura que aparezca inmediatamente en el ranking aunque no haya completado nada
            leaderboardService.updateUserLeaderboardEntry(
                    event.getUserId(),
                    event.getWeekNumber(),
                    event.getYear()
            );

            logger.info("✅ Usuario {} agregado/actualizado en leaderboard semana {}-{}",
                    event.getUserId(), event.getWeekNumber(), event.getYear());
        } catch (Exception e) {
            logger.error("❌ Error actualizando leaderboard tras asignación de misión - Usuario: {}",
                    event.getUserId(), e);
        }
    }

    /**
     * Actualiza la entrada de un usuario en el leaderboard de la semana actual.
     */
    private void updateUserLeaderboard(java.util.UUID userId) {
        try {
            java.time.LocalDate now = java.time.LocalDate.now();
            int weekNum = now.get(java.time.temporal.IsoFields.WEEK_OF_WEEK_BASED_YEAR);
            int year = now.getYear();
            String weekNumber = String.format("%04d-W%02d", year, weekNum);

            leaderboardService.updateUserLeaderboardEntry(userId, weekNumber, year);

            logger.info("✅ Leaderboard actualizado para usuario {} en semana {}", userId, weekNumber);
        } catch (Exception e) {
            logger.error("❌ Error actualizando leaderboard para usuario {}", userId, e);
        }
    }
}
