package com.ecoestudiante.gamification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Evento publicado cuando un usuario completa un cálculo de huella de carbono.
 * Este evento permite que el sistema de gamificación reaccione automáticamente
 * actualizando el progreso de misiones relacionadas.
 */
@Getter
public class CalculationCompletedEvent extends ApplicationEvent {

    private final UUID userId;
    private final String calculationId;
    private final String category; // electricidad, transporte, residuos
    private final BigDecimal kgCO2e; // Emisiones calculadas
    private final Map<String, Object> calculationInput; // Datos del cálculo
    private final LocalDateTime calculatedAt;

    public CalculationCompletedEvent(
            Object source,
            UUID userId,
            String calculationId,
            String category,
            BigDecimal kgCO2e,
            Map<String, Object> calculationInput,
            LocalDateTime calculatedAt
    ) {
        super(source);
        this.userId = userId;
        this.calculationId = calculationId;
        this.category = category;
        this.kgCO2e = kgCO2e;
        this.calculationInput = calculationInput;
        this.calculatedAt = calculatedAt;
    }
}
