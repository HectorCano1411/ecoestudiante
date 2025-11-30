package com.ecoestudiante.gamification.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Modelo de dominio para el Cache del Leaderboard (Ranking).
 *
 * Almacena una snapshot pre-calculada del ranking semanal para optimizar consultas.
 * El ranking se basa en kg de CO₂ evitados en la semana.
 *
 * Se recalcula periódicamente (1 vez al día o bajo demanda).
 *
 * Mapea a la tabla: leaderboard_cache
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Data
public class LeaderboardCache {

    /**
     * ID único del registro de cache
     */
    private Long id;

    /**
     * ID del usuario (FK a app_user.id)
     */
    private UUID userId;

    /**
     * Número de semana ISO (formato: 2025-W01)
     */
    private String weekNumber;

    /**
     * Año de la semana
     */
    private Integer year;

    /**
     * Kilogramos de CO₂ evitados en la semana vs baseline
     * Esta es la métrica principal del ranking
     */
    private BigDecimal co2AvoidedKg;

    /**
     * Número de misiones completadas en la semana
     */
    private Integer missionsCompleted;

    /**
     * XP total ganado en la semana
     */
    private Integer totalXpWeek;

    /**
     * Posición en el ranking (1 = primero)
     */
    private Integer rankPosition;

    /**
     * Fecha y hora del último cálculo del cache
     */
    private LocalDateTime calculatedAt;

    /**
     * Determina si el usuario está en el Top 10
     *
     * @return true si la posición es 10 o menor
     */
    public boolean isTopTen() {
        return rankPosition != null && rankPosition <= 10;
    }

    /**
     * Determina si el usuario está en el Top 100
     *
     * @return true si la posición es 100 o menor
     */
    public boolean isTopHundred() {
        return rankPosition != null && rankPosition <= 100;
    }

    /**
     * Obtiene el identificador de la semana completo
     *
     * @return String en formato "YYYY-WXX" (ejemplo: "2025-W01")
     */
    public String getWeekIdentifier() {
        if (weekNumber == null) return null;
        return weekNumber;
    }

    /**
     * Obtiene una medalla según la posición en el ranking
     *
     * @return Emoji de medalla o null si no aplica
     */
    public String getMedalEmoji() {
        if (rankPosition == null) return null;

        return switch (rankPosition) {
            case 1 -> "🥇"; // Oro
            case 2 -> "🥈"; // Plata
            case 3 -> "🥉"; // Bronce
            default -> null;
        };
    }

    /**
     * Formatea el CO₂ evitado con unidad
     *
     * @return String formateado (ejemplo: "12.5 kg")
     */
    public String getFormattedCo2Avoided() {
        if (co2AvoidedKg == null) return "0 kg";
        return String.format("%.1f kg", co2AvoidedKg);
    }
}
