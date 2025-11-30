package com.ecoestudiante.gamification.controller;

import com.ecoestudiante.auth.UserContextResolver;
import com.ecoestudiante.gamification.dto.MissionDtos;
import com.ecoestudiante.gamification.service.MissionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.IsoFields;
import java.util.List;

/**
 * Controlador REST para Misiones Verdes.
 *
 * Gestiona endpoints para:
 * - Listar misiones disponibles
 * - Ver progreso de misiones
 * - Asignar misiones a usuarios
 * - Actualizar progreso
 * - Completar misiones
 *
 * Ruta base: /api/v1/gam/missions
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@RestController
@RequestMapping("/api/v1/gam/missions")
@Tag(name = "Misiones Verdes", description = "API para gestión de misiones semanales de gamificación")
public class MissionController {

    private static final Logger logger = LoggerFactory.getLogger(MissionController.class);

    private final MissionService missionService;
    private final UserContextResolver userContextResolver;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public MissionController(
            MissionService missionService,
            UserContextResolver userContextResolver,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.missionService = missionService;
        this.userContextResolver = userContextResolver;
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Lista todas las misiones de la semana actual
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Listar misiones de la semana",
            description = "Retorna todas las misiones disponibles para la semana actual"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Misiones obtenidas exitosamente",
                    content = @Content(schema = @Schema(implementation = MissionDtos.MissionsListResponse.class))),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<MissionDtos.MissionsListResponse> getCurrentWeekMissions() {
        try {
            String[] currentWeek = getCurrentWeekAndYear();
            List<MissionDtos.MissionResponse> missions = missionService.getMissionsByWeek(
                    currentWeek[0], Integer.parseInt(currentWeek[1])
            );

            MissionDtos.MissionsListResponse response = new MissionDtos.MissionsListResponse(
                    missions,
                    missions.size(),
                    currentWeek[0]
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener misiones de la semana", e);
            throw new RuntimeException("Error al obtener misiones", e);
        }
    }

    /**
     * Obtiene el progreso del usuario en sus misiones
     */
    @GetMapping(path = "/my-progress", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Ver mi progreso en misiones",
            description = "Retorna todas las misiones del usuario (activas, completadas, expiradas)"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Progreso obtenido exitosamente",
                    content = @Content(schema = @Schema(implementation = MissionDtos.UserMissionsProgressResponse.class))),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<MissionDtos.UserMissionsProgressResponse> getMyProgress(HttpServletRequest request) {
        try {
            Long userId = getUserIdAsLong(request);
            logger.info("Obteniendo progreso de misiones para usuario: {}", userId);

            MissionDtos.UserMissionsProgressResponse progress = missionService.getAllUserMissions(userId);

            return ResponseEntity.ok(progress);
        } catch (Exception e) {
            logger.error("Error al obtener progreso de misiones", e);
            throw new RuntimeException("Error al obtener progreso", e);
        }
    }

    /**
     * Obtiene solo las misiones activas del usuario
     */
    @GetMapping(path = "/active", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Ver misiones activas",
            description = "Retorna solo las misiones actualmente activas del usuario"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Misiones activas obtenidas"),
            @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<List<MissionDtos.MissionProgressResponse>> getActiveMissions(HttpServletRequest request) {
        try {
            Long userId = getUserIdAsLong(request);
            logger.info("Obteniendo misiones activas para usuario: {}", userId);

            List<MissionDtos.MissionProgressResponse> activeMissions = missionService.getActiveMissionsForUser(userId);

            return ResponseEntity.ok(activeMissions);
        } catch (Exception e) {
            logger.error("Error al obtener misiones activas", e);
            throw new RuntimeException("Error al obtener misiones activas", e);
        }
    }

    /**
     * Asigna una misión al usuario
     */
    @PostMapping(path = "/{missionId}/assign", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Asignar misión",
            description = "Asigna una misión específica al usuario actual"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Misión asignada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Misión ya asignada o inválida"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "404", description = "Misión no encontrada")
    })
    public ResponseEntity<MissionDtos.MissionProgressResponse> assignMission(
            @PathVariable Long missionId,
            @RequestBody(required = false) MissionDtos.CreateMissionProgressRequest request,
            HttpServletRequest httpRequest) {

        try {
            Long userId = getUserIdAsLong(httpRequest);
            logger.info("Asignando misión {} a usuario {}", missionId, userId);

            // Si no se proporciona request, crear uno vacío
            if (request == null) {
                request = new MissionDtos.CreateMissionProgressRequest(missionId, null);
            }

            MissionDtos.MissionProgressResponse progress = missionService.assignMissionToUser(userId, request);

            return ResponseEntity.status(HttpStatus.CREATED).body(progress);
        } catch (RuntimeException e) {
            logger.error("Error al asignar misión {}", missionId, e);
            throw e;
        }
    }

    /**
     * Actualiza el progreso de una misión
     */
    @PutMapping(path = "/{missionId}/progress", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Actualizar progreso",
            description = "Actualiza el progreso del usuario en una misión específica"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Progreso actualizado exitosamente"),
            @ApiResponse(responseCode = "400", description = "Progreso inválido"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "404", description = "Misión o progreso no encontrado")
    })
    public ResponseEntity<MissionDtos.MissionProgressResponse> updateProgress(
            @PathVariable Long missionId,
            @RequestBody MissionDtos.UpdateProgressRequest request,
            HttpServletRequest httpRequest) {

        try {
            Long userId = getUserIdAsLong(httpRequest);
            logger.info("Actualizando progreso de misión {} para usuario {}", missionId, userId);

            MissionDtos.MissionProgressResponse progress = missionService.updateMissionProgress(
                    userId, missionId, request
            );

            return ResponseEntity.ok(progress);
        } catch (RuntimeException e) {
            logger.error("Error al actualizar progreso de misión {}", missionId, e);
            throw e;
        }
    }

    /**
     * Completa una misión manualmente
     */
    @PostMapping(path = "/{missionId}/complete", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Completar misión",
            description = "Marca una misión como completada manualmente (normalmente se completa automáticamente)"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Misión completada exitosamente"),
            @ApiResponse(responseCode = "400", description = "Misión no puede completarse"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "404", description = "Misión no encontrada")
    })
    public ResponseEntity<MissionDtos.MissionProgressResponse> completeMission(
            @PathVariable Long missionId,
            HttpServletRequest request) {

        try {
            Long userId = getUserIdAsLong(request);
            logger.info("Completando misión {} para usuario {}", missionId, userId);

            MissionDtos.MissionProgressResponse progress = missionService.completeMission(userId, missionId);

            return ResponseEntity.ok(progress);
        } catch (RuntimeException e) {
            logger.error("Error al completar misión {}", missionId, e);
            throw e;
        }
    }

    /**
     * Verifica y completa misiones automáticamente
     */
    @PostMapping(path = "/check", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Verificar misiones",
            description = "Verifica todas las misiones activas y completa las que alcanzaron su objetivo"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Verificación completada"),
            @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<List<MissionDtos.MissionProgressResponse>> checkMissions(HttpServletRequest request) {
        try {
            Long userId = getUserIdAsLong(request);
            logger.info("Verificando misiones para usuario {}", userId);

            List<MissionDtos.MissionProgressResponse> completedMissions = missionService.checkAndCompleteMissions(userId);

            return ResponseEntity.ok(completedMissions);
        } catch (Exception e) {
            logger.error("Error al verificar misiones", e);
            throw new RuntimeException("Error al verificar misiones", e);
        }
    }

    // =========================================================================
    // Métodos auxiliares
    // =========================================================================

    private String[] getCurrentWeekAndYear() {
        LocalDate now = LocalDate.now();
        int weekNum = now.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR);
        int year = now.get(IsoFields.WEEK_BASED_YEAR);
        String weekNumber = String.format("%d-W%02d", year, weekNum);
        return new String[]{weekNumber, String.valueOf(year)};
    }

    private Long getUserIdAsLong(HttpServletRequest request) {
        java.util.UUID uuid = userContextResolver.resolve(request).normalizedUserId();
        // Convertir UUID a Long mediante consulta a BD
        String sql = "SELECT CAST(id AS BIGINT) FROM users WHERE id = CAST(? AS UUID)";
        return jdbcTemplate.queryForObject(sql, Long.class, uuid.toString());
    }
}
