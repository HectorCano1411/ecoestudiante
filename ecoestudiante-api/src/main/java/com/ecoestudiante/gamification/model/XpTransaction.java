package com.ecoestudiante.gamification.model;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Modelo de dominio para Transacciones de XP.
 *
 * Registro auditado de todas las transacciones de experiencia (XP).
 * Permite rastrear cómo y cuándo los usuarios ganaron (o perdieron) XP.
 *
 * Útil para:
 * - Auditoría y debugging
 * - Análisis de engagement
 * - Rollback de transacciones si es necesario
 *
 * Mapea a la tabla: xp_transactions
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@Data
public class XpTransaction {

    /**
     * ID único de la transacción
     */
    private Long id;

    /**
     * ID del usuario que recibe/pierde XP (FK a app_user.id)
     */
    private UUID userId;

    /**
     * Cantidad de XP
     * Positivo = ganado, Negativo = perdido/penalización
     */
    private Integer amount;

    /**
     * Fuente de la transacción
     * Valores: MISSION_COMPLETE, CALCULATION, STREAK_BONUS, ACHIEVEMENT, MANUAL
     */
    private XpSource source;

    /**
     * ID de referencia al origen de la transacción
     * Ejemplo: mission_id si source = MISSION_COMPLETE
     */
    private Long referenceId;

    /**
     * Tipo de referencia
     * Ejemplo: "mission", "calculation", "streak", "achievement"
     */
    private String referenceType;

    /**
     * Descripción opcional de la transacción
     * Ejemplo: "Misión completada: Usa Transporte Público"
     */
    private String description;

    /**
     * Fecha de creación de la transacción
     */
    private LocalDateTime createdAt;

    /**
     * Enumeración para fuentes de XP
     */
    public enum XpSource {
        MISSION_COMPLETE,  // XP por completar una misión
        CALCULATION,       // XP por registrar un cálculo
        STREAK_BONUS,      // XP bonus por mantener racha
        ACHIEVEMENT,       // XP por desbloquear un logro
        MANUAL             // XP otorgado manualmente (admin)
    }

    /**
     * Obtiene la etiqueta de la fuente en español
     *
     * @return Texto de la fuente en español
     */
    public String getSourceLabel() {
        if (source == null) return "Desconocido";

        return switch (source) {
            case MISSION_COMPLETE -> "Misión Completada";
            case CALCULATION -> "Cálculo Registrado";
            case STREAK_BONUS -> "Bonus de Racha";
            case ACHIEVEMENT -> "Logro Desbloqueado";
            case MANUAL -> "Otorgado Manualmente";
        };
    }

    /**
     * Verifica si la transacción es una ganancia de XP
     *
     * @return true si el amount es positivo
     */
    public boolean isGain() {
        return amount != null && amount > 0;
    }

    /**
     * Verifica si la transacción es una pérdida de XP
     *
     * @return true si el amount es negativo
     */
    public boolean isLoss() {
        return amount != null && amount < 0;
    }
}
