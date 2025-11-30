package com.ecoestudiante.gamification.model;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Modelo de dominio para Misiones Verdes.
 *
 * Representa los desafíos y misiones que los usuarios pueden completar
 * para ganar XP y reducir su huella de carbono.
 *
 * Puede ser:
 * - Template (is_template = true): Plantilla reutilizable
 * - Instancia (is_template = false): Misión asignada a una semana específica
 *
 * Mapea a la tabla: missions
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Data
public class Mission {

    /**
     * ID único de la misión
     */
    private Long id;

    /**
     * Título de la misión
     * Ejemplo: "Usa Transporte Público"
     */
    private String title;

    /**
     * Descripción detallada de la misión
     * Ejemplo: "Utiliza transporte público al menos 3 veces esta semana"
     */
    private String description;

    /**
     * Categoría de la misión
     * Valores: ELECTRICITY, TRANSPORT, WASTE, GENERAL, BONUS
     */
    private MissionCategory category;

    /**
     * Tipo de misión
     * Valores: REDUCTION, FREQUENCY, DISCOVERY, BONUS
     */
    private MissionType type;

    /**
     * Dificultad de la misión
     * Valores: EASY, MEDIUM, HARD
     */
    private MissionDifficulty difficulty;

    /**
     * Valor objetivo de la misión
     * Ejemplo: 3 (para "3 veces"), 10 (para "10%")
     */
    private BigDecimal targetValue;

    /**
     * Unidad del objetivo
     * Ejemplo: "times", "percentage", "days", "kg_co2"
     */
    private String targetUnit;

    /**
     * XP otorgado al completar la misión
     */
    private Integer xpReward;

    /**
     * Impacto estimado en kg de CO2 evitados
     */
    private BigDecimal co2ImpactKg;

    /**
     * Número de semana ISO (formato: 2025-W01)
     * Null si es template
     */
    private String weekNumber;

    /**
     * Año de la misión
     * Null si es template
     */
    private Integer year;

    /**
     * Indica si es una plantilla reutilizable (true) o una instancia semanal (false)
     */
    private Boolean isTemplate;

    /**
     * Fecha de creación de la misión
     */
    private LocalDateTime createdAt;

    /**
     * Enumeración para categorías de misión
     */
    public enum MissionCategory {
        ELECTRICITY,
        TRANSPORT,
        WASTE,
        GENERAL,
        BONUS
    }

    /**
     * Enumeración para tipos de misión
     */
    public enum MissionType {
        REDUCTION,    // Reducir X% de emisiones
        FREQUENCY,    // Hacer algo N veces
        DISCOVERY,    // Descubrir/explorar funcionalidades
        BONUS         // Misiones especiales
    }

    /**
     * Enumeración para dificultad de misión
     */
    public enum MissionDifficulty {
        EASY,
        MEDIUM,
        HARD
    }

    /**
     * Obtiene la descripción de la dificultad en español
     */
    public String getDifficultyLabel() {
        return switch (difficulty) {
            case EASY -> "Fácil";
            case MEDIUM -> "Media";
            case HARD -> "Difícil";
        };
    }
}
