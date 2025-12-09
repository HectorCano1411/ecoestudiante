package com.ecoestudiante.gamification.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.List;

/**
 * DTOs para el Bounded Context de Gamificación.
 * 
 * Este bounded context maneja:
 * - Challenges (desafíos) para motivar a los usuarios
 * - XP (puntos de experiencia) y sistema de niveles
 * - Streaks (rachas) de días consecutivos
 * - Logros y badges
 * - Notificaciones de logros
 * 
 * Alineado con la arquitectura de microservicios descrita en la tesis.
 * 
 * @author EcoEstudiante Team
 * @version 0.1.0-SNAPSHOT
 * @since 2025-01-27
 */
public final class GamificationDtos {

    /**
     * Representa un Challenge (desafío) disponible para el usuario.
     * 
     * Los challenges motivan a los usuarios a reducir su huella de carbono
     * mediante objetivos específicos y medibles.
     */
    public record Challenge(
            @Schema(description = "ID único del challenge", example = "challenge-001")
            String id,
            
            @Schema(description = "Título del challenge", example = "Reduce 10% tu huella este mes")
            String title,
            
            @Schema(description = "Descripción detallada del challenge")
            String description,
            
            @Schema(description = "Tipo de challenge", example = "REDUCTION", allowableValues = {"REDUCTION", "CONSISTENCY", "CATEGORY"})
            String type,
            
            @Schema(description = "Objetivo del challenge (ej: porcentaje de reducción, días consecutivos)")
            Double target,
            
            @Schema(description = "XP otorgado al completar el challenge")
            Integer xpReward,
            
            @Schema(description = "Fecha de inicio del challenge")
            LocalDateTime startDate,
            
            @Schema(description = "Fecha de fin del challenge")
            LocalDateTime endDate,
            
            @Schema(description = "Estado del challenge para el usuario", example = "ACTIVE", allowableValues = {"ACTIVE", "COMPLETED", "EXPIRED"})
            String status
    ) {}

    /**
     * Representa el balance de XP (puntos de experiencia) del usuario.
     *
     * El sistema de XP recompensa acciones positivas como calcular huella,
     * completar challenges, mantener rachas, etc.
     */
    public record XPBalance(
            @Schema(description = "XP total acumulado", example = "1250")
            Integer totalXp,

            @Schema(description = "Nivel actual del usuario", example = "5")
            Integer currentLevel,

            @Schema(description = "XP necesario para el siguiente nivel", example = "1500")
            Integer xpToNextLevel,

            @Schema(description = "XP ganado en el último mes")
            Integer xpThisMonth,

            @Schema(description = "Última actualización del balance")
            LocalDateTime updatedAt
    ) {}

    /**
     * Representa información sobre rachas (streaks) del usuario.
     * 
     * Las rachas motivan consistencia al calcular y registrar actividades.
     */
    public record StreakInfo(
            @Schema(description = "Racha actual de días consecutivos", example = "7")
            Integer currentStreak,
            
            @Schema(description = "Racha más larga alcanzada", example = "30")
            Integer longestStreak,
            
            @Schema(description = "Fecha de inicio de la racha actual")
            LocalDateTime streakStartDate,
            
            @Schema(description = "Última actividad registrada")
            LocalDateTime lastActivityDate,
            
            @Schema(description = "Tipo de racha", example = "CALCULATION", allowableValues = {"CALCULATION", "LOGIN", "CHALLENGE"})
            String streakType
    ) {}

    /**
     * Representa un logro o badge obtenido por el usuario.
     */
    public record Achievement(
            @Schema(description = "ID único del logro", example = "badge-first-calculation")
            String id,
            
            @Schema(description = "Nombre del logro", example = "Primer Cálculo")
            String name,
            
            @Schema(description = "Descripción del logro")
            String description,
            
            @Schema(description = "Icono o imagen del badge")
            String iconUrl,
            
            @Schema(description = "Fecha en que se obtuvo el logro")
            LocalDateTime unlockedAt,
            
            @Schema(description = "Rareza del logro", example = "COMMON", allowableValues = {"COMMON", "RARE", "EPIC", "LEGENDARY"})
            String rarity
    ) {}

    /**
     * Respuesta con lista de challenges activos.
     */
    public record ChallengesResponse(
            @Schema(description = "Lista de challenges disponibles")
            List<Challenge> challenges,
            
            @Schema(description = "Total de challenges")
            Integer total
    ) {}

    /**
     * Respuesta con lista de logros del usuario.
     */
    public record AchievementsResponse(
            @Schema(description = "Lista de logros obtenidos")
            List<Achievement> achievements,
            
            @Schema(description = "Total de logros desbloqueados")
            Integer unlockedCount,
            
            @Schema(description = "Total de logros disponibles")
            Integer totalAvailable
    ) {}
}




