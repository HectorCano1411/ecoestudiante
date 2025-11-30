package com.ecoestudiante.gamification.controller;

import com.ecoestudiante.auth.UserContextResolver;
import com.ecoestudiante.gamification.dto.MissionDtos;
import com.ecoestudiante.gamification.service.LeaderboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.time.temporal.IsoFields;

/**
 * Controlador REST para Leaderboard (Ranking).
 *
 * Gestiona endpoints para:
 * - Ver ranking semanal (top N)
 * - Ver posición del usuario
 * - Recalcular ranking (admin)
 *
 * Ruta base: /api/v1/gam/leaderboard
 *
 * @author EcoEstudiante Team
 * @version 1.0.0
 * @since 2025-11-30
 */
@RestController
@RequestMapping("/api/v1/gam/leaderboard")
@Tag(name = "Leaderboard", description = "API para ranking semanal de gamificación")
public class LeaderboardController {

    private static final Logger logger = LoggerFactory.getLogger(LeaderboardController.class);

    private final LeaderboardService leaderboardService;
    private final UserContextResolver userContextResolver;
    private final org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    public LeaderboardController(
            LeaderboardService leaderboardService,
            UserContextResolver userContextResolver,
            org.springframework.jdbc.core.JdbcTemplate jdbcTemplate) {
        this.leaderboardService = leaderboardService;
        this.userContextResolver = userContextResolver;
        this.jdbcTemplate = jdbcTemplate;
    }

    private Long getUserIdAsLong(HttpServletRequest request) {
        java.util.UUID uuid = userContextResolver.resolve(request).normalizedUserId();
        String sql = "SELECT CAST(id AS BIGINT) FROM users WHERE id = CAST(? AS UUID)";
        return jdbcTemplate.queryForObject(sql, Long.class, uuid.toString());
    }

    /**
     * Obtiene el leaderboard de la semana actual
     */
    @GetMapping(produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Ver ranking actual",
            description = "Retorna el ranking de la semana actual con top N usuarios y la posición del usuario actual"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leaderboard obtenido exitosamente",
                    content = @Content(schema = @Schema(implementation = MissionDtos.LeaderboardResponse.class))),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<MissionDtos.LeaderboardResponse> getCurrentLeaderboard(
            @Parameter(description = "Número de usuarios top a mostrar")
            @RequestParam(defaultValue = "10") int topN,
            HttpServletRequest request) {

        try {
            Long userId = getUserIdAsLong(request);
            logger.info("Obteniendo leaderboard actual (top {}) para usuario {}", topN, userId);

            // Obtener leaderboard
            MissionDtos.LeaderboardResponse leaderboard = leaderboardService.getCurrentWeekLeaderboard(topN);

            // Obtener posición del usuario si no está en el top
            MissionDtos.LeaderboardEntryResponse userPosition = leaderboardService.getUserPosition(userId);

            // Si el usuario no está en el top N, agregarlo como currentUser
            boolean userInTop = leaderboard.topUsers().stream()
                    .anyMatch(entry -> entry.userId().equals(userId));

            if (!userInTop && userPosition != null) {
                leaderboard = new MissionDtos.LeaderboardResponse(
                        leaderboard.weekNumber(),
                        leaderboard.year(),
                        leaderboard.topUsers(),
                        userPosition,
                        leaderboard.totalUsers(),
                        leaderboard.calculatedAt()
                );
            }

            return ResponseEntity.ok(leaderboard);
        } catch (Exception e) {
            logger.error("Error al obtener leaderboard", e);
            throw new RuntimeException("Error al obtener leaderboard", e);
        }
    }

    /**
     * Obtiene el leaderboard de una semana específica
     */
    @GetMapping(path = "/week/{weekNumber}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Ver ranking de semana específica",
            description = "Retorna el ranking de una semana específica (formato: 2025-W01)"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Leaderboard obtenido exitosamente"),
            @ApiResponse(responseCode = "400", description = "Formato de semana inválido"),
            @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<MissionDtos.LeaderboardResponse> getWeekLeaderboard(
            @Parameter(description = "Número de semana en formato ISO (ejemplo: 2025-W01)")
            @PathVariable String weekNumber,
            @Parameter(description = "Año")
            @RequestParam(required = false) Integer year,
            @Parameter(description = "Número de usuarios top a mostrar")
            @RequestParam(defaultValue = "10") int topN,
            HttpServletRequest request) {

        try {
            Long userId = getUserIdAsLong(request);

            // Parsear año si no se proporciona
            if (year == null) {
                String[] parts = weekNumber.split("-");
                year = Integer.parseInt(parts[0]);
            }

            logger.info("Obteniendo leaderboard de semana {}-{} (top {}) para usuario {}",
                    weekNumber, year, topN, userId);

            MissionDtos.LeaderboardResponse leaderboard = leaderboardService.getWeekLeaderboard(
                    weekNumber, year, topN
            );

            // Agregar posición del usuario si no está en el top
            MissionDtos.LeaderboardEntryResponse userPosition = leaderboardService.getUserPositionInWeek(
                    userId, weekNumber, year
            );

            boolean userInTop = leaderboard.topUsers().stream()
                    .anyMatch(entry -> entry.userId().equals(userId));

            if (!userInTop && userPosition != null) {
                leaderboard = new MissionDtos.LeaderboardResponse(
                        leaderboard.weekNumber(),
                        leaderboard.year(),
                        leaderboard.topUsers(),
                        userPosition,
                        leaderboard.totalUsers(),
                        leaderboard.calculatedAt()
                );
            }

            return ResponseEntity.ok(leaderboard);
        } catch (Exception e) {
            logger.error("Error al obtener leaderboard de semana {}", weekNumber, e);
            throw new RuntimeException("Error al obtener leaderboard", e);
        }
    }

    /**
     * Obtiene solo la posición del usuario actual
     */
    @GetMapping(path = "/my-position", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Ver mi posición",
            description = "Retorna la posición del usuario actual en el ranking de la semana"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Posición obtenida exitosamente"),
            @ApiResponse(responseCode = "404", description = "Usuario no está en el ranking"),
            @ApiResponse(responseCode = "401", description = "No autenticado")
    })
    public ResponseEntity<MissionDtos.LeaderboardEntryResponse> getMyPosition(HttpServletRequest request) {
        try {
            Long userId = getUserIdAsLong(request);
            logger.info("Obteniendo posición de usuario {} en leaderboard", userId);

            MissionDtos.LeaderboardEntryResponse position = leaderboardService.getUserPosition(userId);

            if (position == null) {
                return ResponseEntity.notFound().build();
            }

            return ResponseEntity.ok(position);
        } catch (Exception e) {
            logger.error("Error al obtener posición del usuario", e);
            throw new RuntimeException("Error al obtener posición", e);
        }
    }

    /**
     * Recalcula el leaderboard de la semana actual (endpoint administrativo)
     */
    @PostMapping(path = "/recalculate", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Recalcular ranking (Admin)",
            description = "Recalcula el ranking de la semana actual con datos frescos"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recálculo completado exitosamente"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "403", description = "No autorizado (requiere admin)")
    })
    public ResponseEntity<MissionDtos.SuccessResponse> recalculateLeaderboard() {
        try {
            logger.info("Recalculando leaderboard de semana actual");

            int usersProcessed = leaderboardService.recalculateCurrentWeekLeaderboard();

            MissionDtos.SuccessResponse response = new MissionDtos.SuccessResponse(
                    "Leaderboard recalculado exitosamente",
                    usersProcessed
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al recalcular leaderboard", e);
            throw new RuntimeException("Error al recalcular leaderboard", e);
        }
    }

    /**
     * Recalcula el leaderboard de una semana específica (endpoint administrativo)
     */
    @PostMapping(path = "/recalculate/{weekNumber}", produces = MediaType.APPLICATION_JSON_VALUE)
    @Operation(
            summary = "Recalcular ranking de semana específica (Admin)",
            description = "Recalcula el ranking de una semana específica"
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Recálculo completado"),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "403", description = "No autorizado")
    })
    public ResponseEntity<MissionDtos.SuccessResponse> recalculateWeekLeaderboard(
            @PathVariable String weekNumber,
            @RequestParam(required = false) Integer year) {

        try {
            // Parsear año si no se proporciona
            if (year == null) {
                String[] parts = weekNumber.split("-");
                year = Integer.parseInt(parts[0]);
            }

            logger.info("Recalculando leaderboard de semana {}-{}", weekNumber, year);

            int usersProcessed = leaderboardService.recalculateWeekLeaderboard(weekNumber, year);

            MissionDtos.SuccessResponse response = new MissionDtos.SuccessResponse(
                    String.format("Leaderboard de semana %s recalculado exitosamente", weekNumber),
                    usersProcessed
            );

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al recalcular leaderboard de semana {}", weekNumber, e);
            throw new RuntimeException("Error al recalcular leaderboard", e);
        }
    }
}
