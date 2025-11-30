package com.ecoestudiante.gamification.model;

import lombok.Data;
import java.time.LocalDate;
import java.time.LocalDateTime;

/**
 * Modelo de dominio para el Perfil de Gamificación del usuario.
 *
 * Representa el estado de gamificación de un usuario, incluyendo:
 * - XP total acumulado y nivel actual
 * - Rachas (streaks) actuales y récords
 * - Última actividad registrada
 *
 * Mapea a la tabla: gamification_profiles
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Data
public class GamificationProfile {

    /**
     * ID único del perfil de gamificación
     */
    private Long id;

    /**
     * ID del usuario (FK a users.id)
     * Relación 1:1 con la tabla users
     */
    private Long userId;

    /**
     * Experiencia total acumulada por el usuario
     * Se usa para calcular el nivel actual
     */
    private Long totalXp;

    /**
     * Nivel actual del usuario
     * Calculado automáticamente como: floor(sqrt(totalXp / 100))
     */
    private Integer currentLevel;

    /**
     * Racha actual de semanas consecutivas con al menos 1 misión completada
     */
    private Integer currentStreak;

    /**
     * Mejor racha histórica alcanzada por el usuario
     */
    private Integer bestStreak;

    /**
     * Fecha de la última actividad del usuario
     * Se usa para calcular y mantener las rachas
     */
    private LocalDate lastActivityDate;

    /**
     * Fecha de creación del perfil
     */
    private LocalDateTime createdAt;

    /**
     * Fecha de última actualización
     */
    private LocalDateTime updatedAt;

    /**
     * Calcula el título/rango según el nivel actual
     *
     * @return Título del usuario según su nivel
     */
    public String getLevelTitle() {
        if (currentLevel == null) return "Eco-Aprendiz";

        return switch (currentLevel) {
            case 1, 2 -> "Eco-Aprendiz";
            case 3, 4, 5 -> "Guardián Verde";
            case 6, 7, 8, 9 -> "Héroe Sostenible";
            case 10, 11, 12, 13, 14, 15 -> "Campeón del Planeta";
            default -> "Leyenda Ecológica";
        };
    }

    /**
     * Calcula el multiplicador de XP según la racha actual
     *
     * @return Multiplicador de XP (1.0, 1.2, 1.5 o 2.0)
     */
    public double getStreakMultiplier() {
        if (currentStreak == null || currentStreak <= 2) return 1.0;
        if (currentStreak <= 4) return 1.2;
        if (currentStreak <= 7) return 1.5;
        return 2.0;
    }

    /**
     * Calcula el XP necesario para alcanzar el siguiente nivel
     *
     * @return XP necesario para subir de nivel
     */
    public Long getXpToNextLevel() {
        if (currentLevel == null || totalXp == null) return 100L;

        long nextLevelXp = (long) Math.pow(currentLevel + 1, 2) * 100;
        long currentLevelXp = (long) Math.pow(currentLevel, 2) * 100;

        return nextLevelXp - totalXp;
    }

    /**
     * Calcula el progreso hacia el siguiente nivel como porcentaje
     *
     * @return Porcentaje de progreso (0-100)
     */
    public double getProgressToNextLevel() {
        if (currentLevel == null || totalXp == null) return 0.0;

        long currentLevelXp = (long) Math.pow(currentLevel, 2) * 100;
        long nextLevelXp = (long) Math.pow(currentLevel + 1, 2) * 100;
        long xpInCurrentLevel = totalXp - currentLevelXp;
        long xpNeededForLevel = nextLevelXp - currentLevelXp;

        if (xpNeededForLevel == 0) return 100.0;

        return (double) xpInCurrentLevel / xpNeededForLevel * 100.0;
    }
}
