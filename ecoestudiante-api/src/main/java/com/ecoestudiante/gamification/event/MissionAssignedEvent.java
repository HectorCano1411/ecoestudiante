package com.ecoestudiante.gamification.event;

import lombok.Getter;
import org.springframework.context.ApplicationEvent;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Evento publicado cuando un usuario acepta/se le asigna una misión.
 * Permite actualizar el leaderboard inmediatamente.
 */
@Getter
public class MissionAssignedEvent extends ApplicationEvent {

    private final UUID userId;
    private final Long missionId;
    private final String weekNumber;
    private final Integer year;
    private final LocalDateTime assignedAt;

    public MissionAssignedEvent(
            Object source,
            UUID userId,
            Long missionId,
            String weekNumber,
            Integer year,
            LocalDateTime assignedAt
    ) {
        super(source);
        this.userId = userId;
        this.missionId = missionId;
        this.weekNumber = weekNumber;
        this.year = year;
        this.assignedAt = assignedAt;
    }
}
