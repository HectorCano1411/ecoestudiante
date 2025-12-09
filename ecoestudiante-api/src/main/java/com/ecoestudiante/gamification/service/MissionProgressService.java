package com.ecoestudiante.gamification.service;

import com.ecoestudiante.gamification.event.CalculationCompletedEvent;

import java.util.UUID;

/**
 * Servicio especializado en actualizar el progreso de misiones basado en cálculos.
 * Implementa la lógica de correlación inteligente entre cálculos y objetivos de misiones.
 */
public interface MissionProgressService {

    /**
     * Procesa un cálculo completado y actualiza todas las misiones activas relacionadas.
     *
     * @param event Evento de cálculo completado con toda la información necesaria
     * @return Número de misiones actualizadas
     */
    int processCalculationAndUpdateMissions(CalculationCompletedEvent event);

    /**
     * Verifica y completa automáticamente misiones que alcanzaron su objetivo.
     *
     * @param userId ID del usuario
     * @return Número de misiones completadas
     */
    int checkAndAutoCompleteMissions(UUID userId);
}
