package com.ecoestudiante.gamification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Evento publicado cuando un usuario completa una misión.
 * Permite actualizar el leaderboard y otorgar recompensas adicionales.
 */
@Getter
public class MissionCompletedEvent extends ApplicationEvent {

    private final UUID userId;
    private final Long missionId;
    private final String missionTitle;
    private final String category;
    private final Integer xpRewarded;
    private final BigDecimal co2ImpactKg;
    private final String weekNumber;
    private final Integer year;
    private final LocalDateTime completedAt;

    public MissionCompletedEvent(
            Object source,
            UUID userId,
            Long missionId,
            String missionTitle,
            String category,
            Integer xpRewarded,
            BigDecimal co2ImpactKg,
            String weekNumber,
            Integer year,
            LocalDateTime completedAt
    ) {
        super(source);
        this.userId = userId;
        this.missionId = missionId;
        this.missionTitle = missionTitle;
        this.category = category;
        this.xpRewarded = xpRewarded;
        this.co2ImpactKg = co2ImpactKg;
        this.weekNumber = weekNumber;
        this.year = year;
        this.completedAt = completedAt;
    }
}
