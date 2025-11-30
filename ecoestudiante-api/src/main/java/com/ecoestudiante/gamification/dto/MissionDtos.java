package com.ecoestudiante.gamification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs para el módulo de Misiones Verdes y Gamificación.
 *
 * Este módulo complementa GamificationDtos.java con DTOs específicos para:
 * - Misiones Verdes Semanales
 * - Progreso de misiones
 * - Perfil de gamificación extendido
 * - Leaderboard (ranking semanal)
 * - Transacciones de XP
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
public final class MissionDtos {

    // =========================================================================
    // DTOs de Misiones
    // =========================================================================

    /**
     * DTO de respuesta para una Misión Verde
     */
    public record MissionResponse(
            @Schema(description = "ID único de la misión", example = "1")
            Long id,

            @Schema(description = "Título de la misión", example = "Usa Transporte Público")
            String title,

            @Schema(description = "Descripción detallada")
            String description,

            @Schema(description = "Categoría", example = "TRANSPORT")
            String category,

            @Schema(description = "Tipo de misión", example = "FREQUENCY")
            String type,

            @Schema(description = "Dificultad", example = "EASY")
            String difficulty,

            @Schema(description = "Valor objetivo", example = "3")
            BigDecimal targetValue,

            @Schema(description = "Unidad del objetivo", example = "times")
            String targetUnit,

            @Schema(description = "XP otorgado al completar", example = "50")
            Integer xpReward,

            @Schema(description = "Impacto en kg CO₂ evitados", example = "5.0")
            BigDecimal co2ImpactKg,

            @Schema(description = "Número de semana ISO", example = "2025-W01")
            String weekNumber,

            @Schema(description = "Año", example = "2025")
            Integer year,

            @Schema(description = "Etiqueta de dificultad en español", example = "Fácil")
            String difficultyLabel
    ) {}

    /**
     * DTO de respuesta para Progreso de Misión
     */
    public record MissionProgressResponse(
            @Schema(description = "ID del progreso", example = "1")
            Long id,

            @Schema(description = "ID de la misión", example = "1")
            Long missionId,

            @Schema(description = "Información de la misión")
            MissionResponse mission,

            @Schema(description = "Progreso actual", example = "2")
            BigDecimal currentProgress,

            @Schema(description = "Progreso objetivo", example = "3")
            BigDecimal targetProgress,

            @Schema(description = "Estado", example = "ACTIVE")
            String status,

            @Schema(description = "Porcentaje de completitud", example = "66.7")
            Double completionPercentage,

            @Schema(description = "Fecha de inicio")
            LocalDateTime startedAt,

            @Schema(description = "Fecha de completitud (null si no completada)")
            LocalDateTime completedAt,

            @Schema(description = "Valor baseline para misiones de reducción")
            BigDecimal baselineValue,

            @Schema(description = "Etiqueta del estado en español", example = "Activa")
            String statusLabel
    ) {}

    /**
     * DTO de solicitud para actualizar progreso
     */
    public record UpdateProgressRequest(
            @Schema(description = "Nuevo valor de progreso", example = "3", required = true)
            BigDecimal progress
    ) {}

    /**
     * DTO de solicitud para crear progreso de misión
     */
    public record CreateMissionProgressRequest(
            @Schema(description = "ID de la misión", required = true)
            Long missionId,

            @Schema(description = "Valor baseline (para misiones de reducción)")
            BigDecimal baselineValue
    ) {}

    // =========================================================================
    // DTOs de Perfil de Gamificación
    // =========================================================================

    /**
     * DTO de respuesta para Perfil de Gamificación
     */
    public record GamificationProfileResponse(
            @Schema(description = "ID del perfil", example = "1")
            Long id,

            @Schema(description = "ID del usuario", example = "1")
            Long userId,

            @Schema(description = "XP total acumulado", example = "1250")
            Long totalXp,

            @Schema(description = "Nivel actual", example = "3")
            Integer currentLevel,

            @Schema(description = "Título/rango actual", example = "Guardián Verde")
            String levelTitle,

            @Schema(description = "Racha actual de semanas", example = "3")
            Integer currentStreak,

            @Schema(description = "Mejor racha histórica", example = "7")
            Integer bestStreak,

            @Schema(description = "Multiplicador de XP por racha", example = "1.2")
            Double streakMultiplier,

            @Schema(description = "XP para el siguiente nivel", example = "350")
            Long xpToNextLevel,

            @Schema(description = "Progreso hacia el siguiente nivel (%)", example = "78.5")
            Double progressToNextLevel,

            @Schema(description = "Última fecha de actividad")
            LocalDate lastActivityDate,

            @Schema(description = "Fecha de creación del perfil")
            LocalDateTime createdAt
    ) {}

    /**
     * DTO de solicitud para otorgar XP
     */
    public record AwardXpRequest(
            @Schema(description = "Cantidad de XP a otorgar", example = "50", required = true)
            Integer amount,

            @Schema(description = "Razón/fuente del XP", example = "MISSION_COMPLETE", required = true)
            String source,

            @Schema(description = "ID de referencia (ej: mission_id)")
            Long referenceId,

            @Schema(description = "Descripción opcional")
            String description
    ) {}

    // =========================================================================
    // DTOs de Leaderboard
    // =========================================================================

    /**
     * DTO de respuesta para entrada del Leaderboard
     */
    public record LeaderboardEntryResponse(
            @Schema(description = "Posición en el ranking", example = "1")
            Integer rank,

            @Schema(description = "ID del usuario", example = "1")
            Long userId,

            @Schema(description = "Nombre de usuario (anonimizado)", example = "eco_hero_***")
            String username,

            @Schema(description = "kg de CO₂ evitados", example = "45.3")
            BigDecimal co2AvoidedKg,

            @Schema(description = "Misiones completadas", example = "5")
            Integer missionsCompleted,

            @Schema(description = "XP ganado esta semana", example = "350")
            Integer totalXpWeek,

            @Schema(description = "Indica si es el usuario actual", example = "false")
            Boolean isCurrentUser,

            @Schema(description = "Emoji de medalla (solo top 3)")
            String medal
    ) {}

    /**
     * DTO de respuesta para el Leaderboard completo
     */
    public record LeaderboardResponse(
            @Schema(description = "Número de semana", example = "2025-W01")
            String weekNumber,

            @Schema(description = "Año", example = "2025")
            Integer year,

            @Schema(description = "Top N usuarios")
            List<LeaderboardEntryResponse> topUsers,

            @Schema(description = "Entrada del usuario actual (si no está en el top)")
            LeaderboardEntryResponse currentUser,

            @Schema(description = "Total de usuarios en el ranking", example = "150")
            Integer totalUsers,

            @Schema(description = "Fecha del último cálculo")
            LocalDateTime calculatedAt
    ) {}

    // =========================================================================
    // DTOs de Transacciones XP
    // =========================================================================

    /**
     * DTO de respuesta para Transacción de XP
     */
    public record XpTransactionResponse(
            @Schema(description = "ID de la transacción", example = "1")
            Long id,

            @Schema(description = "Cantidad de XP", example = "50")
            Integer amount,

            @Schema(description = "Fuente de XP", example = "MISSION_COMPLETE")
            String source,

            @Schema(description = "Etiqueta de la fuente en español", example = "Misión Completada")
            String sourceLabel,

            @Schema(description = "Descripción", example = "Misión completada: Usa Transporte Público")
            String description,

            @Schema(description = "ID de referencia")
            Long referenceId,

            @Schema(description = "Tipo de referencia", example = "mission")
            String referenceType,

            @Schema(description = "Fecha de la transacción")
            LocalDateTime createdAt,

            @Schema(description = "Es ganancia de XP", example = "true")
            Boolean isGain
    ) {}

    /**
     * DTO de respuesta para historial de transacciones
     */
    public record XpHistoryResponse(
            @Schema(description = "Lista de transacciones")
            List<XpTransactionResponse> transactions,

            @Schema(description = "Total de transacciones", example = "25")
            Integer total,

            @Schema(description = "XP total ganado", example = "1250")
            Integer totalXpGained,

            @Schema(description = "XP total perdido", example = "0")
            Integer totalXpLost
    ) {}

    // =========================================================================
    // DTOs de Resumen/Dashboard
    // =========================================================================

    /**
     * DTO de respuesta para Dashboard de Gamificación
     */
    public record GamificationDashboardResponse(
            @Schema(description = "Perfil de gamificación del usuario")
            GamificationProfileResponse profile,

            @Schema(description = "Misiones activas")
            List<MissionProgressResponse> activeMissions,

            @Schema(description = "Posición en el leaderboard actual")
            LeaderboardEntryResponse leaderboardPosition,

            @Schema(description = "Transacciones recientes de XP")
            List<XpTransactionResponse> recentXpTransactions,

            @Schema(description = "Estadísticas de la semana actual")
            WeeklyStatsResponse weeklyStats
    ) {}

    /**
     * DTO de respuesta para estadísticas semanales
     */
    public record WeeklyStatsResponse(
            @Schema(description = "Número de semana", example = "2025-W01")
            String weekNumber,

            @Schema(description = "Misiones completadas esta semana", example = "3")
            Integer missionsCompleted,

            @Schema(description = "XP ganado esta semana", example = "250")
            Integer xpGained,

            @Schema(description = "CO₂ evitado esta semana (kg)", example = "12.5")
            BigDecimal co2Avoided,

            @Schema(description = "Días restantes de la semana", example = "3")
            Integer daysRemaining
    ) {}

    // =========================================================================
    // DTOs de respuesta genéricos
    // =========================================================================

    /**
     * DTO de respuesta genérica de éxito
     */
    public record SuccessResponse(
            @Schema(description = "Mensaje de éxito", example = "Operación completada exitosamente")
            String message,

            @Schema(description = "Datos adicionales opcionales")
            Object data
    ) {}

    /**
     * DTO de respuesta de lista de misiones
     */
    public record MissionsListResponse(
            @Schema(description = "Lista de misiones")
            List<MissionResponse> missions,

            @Schema(description = "Total de misiones", example = "15")
            Integer total,

            @Schema(description = "Número de semana", example = "2025-W01")
            String weekNumber
    ) {}

    /**
     * DTO de respuesta para progreso de misiones de un usuario
     */
    public record UserMissionsProgressResponse(
            @Schema(description = "Misiones activas")
            List<MissionProgressResponse> active,

            @Schema(description = "Misiones completadas")
            List<MissionProgressResponse> completed,

            @Schema(description = "Misiones expiradas")
            List<MissionProgressResponse> expired,

            @Schema(description = "Total de misiones activas", example = "3")
            Integer totalActive,

            @Schema(description = "Total de misiones completadas", example = "5")
            Integer totalCompleted
    ) {}

    // Constructor privado para prevenir instanciación
    private MissionDtos() {
        throw new UnsupportedOperationException("Esta es una clase de utilidad y no puede ser instanciada");
    }
}
