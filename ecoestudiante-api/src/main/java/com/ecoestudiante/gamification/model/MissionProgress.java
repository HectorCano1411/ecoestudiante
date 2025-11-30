package com.ecoestudiante.gamification.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Modelo de dominio para el Progreso de Misiones.
 *
 * Representa el progreso individual de un usuario en una misión específica.
 * Cada usuario puede tener múltiples misiones activas simultáneamente.
 *
 * Mapea a la tabla: mission_progress
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Data
public class MissionProgress {

    /**
     * ID único del progreso
     */
    private Long id;

    /**
     * ID del usuario (FK a users.id)
     */
    private Long userId;

    /**
     * ID de la misión (FK a missions.id)
     */
    private Long missionId;

    /**
     * Progreso actual hacia el objetivo
     * Ejemplo: 2 (si ha usado transporte público 2 veces)
     */
    private BigDecimal currentProgress;

    /**
     * Progreso objetivo para completar la misión
     * Ejemplo: 3 (si el objetivo es 3 veces)
     */
    private BigDecimal targetProgress;

    /**
     * Estado actual de la misión
     * Valores: ACTIVE, COMPLETED, EXPIRED, FAILED
     */
    private MissionStatus status;

    /**
     * Fecha de inicio de la misión
     */
    private LocalDateTime startedAt;

    /**
     * Fecha de completitud (null si aún no se completa)
     */
    private LocalDateTime completedAt;

    /**
     * Valor de referencia (baseline) para misiones de reducción
     * Ejemplo: Promedio de consumo eléctrico del mes anterior
     * Null para misiones que no son de tipo REDUCTION
     */
    private BigDecimal baselineValue;

    /**
     * Enumeración para estados de misión
     */
    public enum MissionStatus {
        ACTIVE,      // Misión activa y en progreso
        COMPLETED,   // Misión completada exitosamente
        EXPIRED,     // Misión expirada (fin de semana sin completar)
        FAILED       // Misión fallida (no se alcanzó el objetivo)
    }

    /**
     * Calcula el porcentaje de completitud de la misión
     *
     * @return Porcentaje de progreso (0-100)
     */
    public double getCompletionPercentage() {
        if (targetProgress == null || targetProgress.compareTo(BigDecimal.ZERO) == 0) {
            return 0.0;
        }

        if (currentProgress == null) {
            return 0.0;
        }

        double percentage = currentProgress
                .divide(targetProgress, 4, BigDecimal.ROUND_HALF_UP)
                .multiply(BigDecimal.valueOf(100))
                .doubleValue();

        return Math.min(percentage, 100.0); // Cap at 100%
    }

    /**
     * Verifica si la misión está completada según el progreso
     *
     * @return true si el progreso alcanzó o superó el objetivo
     */
    public boolean isProgressComplete() {
        if (currentProgress == null || targetProgress == null) {
            return false;
        }

        return currentProgress.compareTo(targetProgress) >= 0;
    }

    /**
     * Obtiene la etiqueta del estado en español
     *
     * @return Texto del estado en español
     */
    public String getStatusLabel() {
        if (status == null) return "Desconocido";

        return switch (status) {
            case ACTIVE -> "Activa";
            case COMPLETED -> "Completada";
            case EXPIRED -> "Expirada";
            case FAILED -> "Fallida";
        };
    }
}
