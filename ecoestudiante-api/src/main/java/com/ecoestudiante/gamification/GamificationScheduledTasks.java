package com.ecoestudiante.gamification;

import com.ecoestudiante.gamification.service.MissionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.temporal.WeekFields;

/**
 * Tareas programadas para el módulo de gamificación.
 * Incluye la generación automática de misiones semanales.
 */
@Component
public class GamificationScheduledTasks {
  private static final Logger logger = LoggerFactory.getLogger(GamificationScheduledTasks.class);

  private final MissionService missionService;

  public GamificationScheduledTasks(MissionService missionService) {
    this.missionService = missionService;
  }

  /**
   * Genera misiones para la semana actual.
   * Se ejecuta cada lunes a las 00:00 (medianoche).
   *
   * Expresión cron: "0 0 0 * * MON"
   * - Segundo: 0
   * - Minuto: 0
   * - Hora: 0
   * - Día del mes: * (cualquiera)
   * - Mes: * (cualquiera)
   * - Día de la semana: MON (lunes)
   */
  @Scheduled(cron = "0 0 0 * * MON", zone = "America/Santiago")
  public void generateWeeklyMissions() {
    try {
      LocalDate now = LocalDate.now();
      WeekFields weekFields = WeekFields.ISO;
      int weekNumber = now.get(weekFields.weekOfWeekBasedYear());
      int year = now.get(weekFields.weekBasedYear());
      String weekString = String.format("%04d-W%02d", year, weekNumber);

      logger.info("========================================");
      logger.info("Iniciando generación automática de misiones semanales");
      logger.info("Semana: {}", weekString);
      logger.info("========================================");

      int generatedCount = missionService.generateWeeklyMissions(weekString, year);

      logger.info("========================================");
      logger.info("Generación de misiones completada exitosamente");
      logger.info("Total de misiones generadas: {}", generatedCount);
      logger.info("========================================");

    } catch (Exception e) {
      logger.error("========================================");
      logger.error("ERROR: Fallo en la generación automática de misiones semanales", e);
      logger.error("========================================");
      // No lanzar excepción para no interrumpir otras tareas programadas
    }
  }

  /**
   * Marca como expiradas las misiones no completadas de la semana anterior.
   * Se ejecuta cada lunes a las 00:05 (5 minutos después de generar nuevas misiones).
   */
  @Scheduled(cron = "0 5 0 * * MON", zone = "America/Santiago")
  public void expireLastWeekMissions() {
    try {
      LocalDate lastWeek = LocalDate.now().minusWeeks(1);
      WeekFields weekFields = WeekFields.ISO;
      int weekNumber = lastWeek.get(weekFields.weekOfWeekBasedYear());
      int year = lastWeek.get(weekFields.weekBasedYear());
      String weekString = String.format("%04d-W%02d", year, weekNumber);

      logger.info("========================================");
      logger.info("Marcando misiones de la semana pasada como expiradas");
      logger.info("Semana: {}", weekString);
      logger.info("========================================");

      int expiredCount = missionService.expireWeeklyMissions(weekString, year);

      logger.info("========================================");
      logger.info("Expiración de misiones completada");
      logger.info("Total de misiones expiradas: {}", expiredCount);
      logger.info("========================================");

    } catch (Exception e) {
      logger.error("========================================");
      logger.error("ERROR: Fallo al marcar misiones como expiradas", e);
      logger.error("========================================");
    }
  }

  /**
   * SOLO PARA TESTING/DEVELOPMENT:
   * Genera misiones cada 5 minutos durante desarrollo.
   * COMENTAR/ELIMINAR ESTE MÉTODO EN PRODUCCIÓN.
   */
  // @Scheduled(cron = "0 */5 * * * *") // Cada 5 minutos
  // public void generateWeeklyMissionsDevMode() {
  //   try {
  //     LocalDate now = LocalDate.now();
  //     WeekFields weekFields = WeekFields.ISO;
  //     int weekNumber = now.get(weekFields.weekOfWeekBasedYear());
  //     int year = now.get(weekFields.weekBasedYear());
  //     String weekString = String.format("%04d-W%02d", year, weekNumber);
  //
  //     logger.info("[DEV MODE] Generando misiones de prueba para semana {}...", weekString);
  //     int generatedCount = missionService.generateWeeklyMissions(weekString, year);
  //     logger.info("[DEV MODE] Misiones generadas: {}", generatedCount);
  //   } catch (Exception e) {
  //     logger.error("[DEV MODE] Error generando misiones: ", e);
  //   }
  // }
}
