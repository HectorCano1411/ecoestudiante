package com.ecoestudiante.gamification.controller;

import com.ecoestudiante.auth.UserContextResolver;
import com.ecoestudiante.gamification.dto.GamificationDtos;
import com.ecoestudiante.gamification.service.GamificationService;
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
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controlador REST para el Servicio de Gamificación.
 * 
 * Este bounded context maneja:
 * - Challenges (desafíos) para motivar reducción de huella de carbono
 * - Sistema de XP (puntos de experiencia) y niveles
 * - Streaks (rachas) de días consecutivos
 * - Logros y badges
 * - Notificaciones de logros
 * 
 * Ruta base: /api/v1/gam
 * Alineado con arquitectura de microservicios descrita en la tesis.
 * 
 * NOTA: Implementación inicial es STUB - retorna datos vacíos o mock.
 * La estructura está lista para implementación completa futura.
 * 
 * @author EcoEstudiante Team
 * @version 0.1.0-SNAPSHOT
 * @since 2025-01-27
 */
@RestController
@RequestMapping("/api/v1/gam")
@Tag(name = "Gamificación", description = "API para sistema de gamificación (challenges, XP, streaks, achievements)")
public class GamificationController {

    private static final Logger logger = LoggerFactory.getLogger(GamificationController.class);
    private final GamificationService gamificationService;
    private final UserContextResolver userContextResolver;

    public GamificationController(
            GamificationService gamificationService,
            UserContextResolver userContextResolver) {
        this.gamificationService = gamificationService;
        this.userContextResolver = userContextResolver;
    }

    /**
     * Obtiene los challenges activos disponibles para el usuario autenticado.
     * 
     * @param request HttpServletRequest para extraer información del usuario
     * @return Lista de challenges activos
     */
    @GetMapping(
            path = "/challenges",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Listar challenges disponibles",
            description = "Retorna lista de challenges activos que el usuario puede completar. " +
                    "Los challenges motivan acciones específicas para reducir la huella de carbono."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de challenges obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = GamificationDtos.ChallengesResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<GamificationDtos.ChallengesResponse> getChallenges(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo challenges para usuario: {}", userId);
            
            List<GamificationDtos.Challenge> challenges = gamificationService.getActiveChallenges(userId);
            
            GamificationDtos.ChallengesResponse response = new GamificationDtos.ChallengesResponse(
                    challenges,
                    challenges != null ? challenges.size() : 0
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener challenges", e);
            throw new RuntimeException("Error al obtener challenges", e);
        }
    }

    /**
     * Obtiene el balance de XP (puntos de experiencia) del usuario.
     * 
     * @param request HttpServletRequest para extraer información del usuario
     * @return Balance de XP con nivel actual y progreso
     */
    @GetMapping(
            path = {"/xp", "/xp-balance"},
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Obtener XP del usuario",
            description = "Retorna el balance de XP del usuario, incluyendo nivel actual, " +
                    "XP total acumulado, y progreso hacia el siguiente nivel."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Balance de XP obtenido exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = GamificationDtos.XPBalance.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<GamificationDtos.XPBalance> getXP(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo balance de XP para usuario: {}", userId);
            
            GamificationDtos.XPBalance balance = gamificationService.getXPBalance(userId);
            return ResponseEntity.ok(balance);
        } catch (Exception e) {
            logger.error("Error al obtener balance de XP", e);
            throw new RuntimeException("Error al obtener balance de XP", e);
        }
    }

    /**
     * Obtiene información sobre las rachas (streaks) del usuario.
     * 
     * @param request HttpServletRequest para extraer información del usuario
     * @return Información de rachas (actual, más larga, etc.)
     */
    @GetMapping(
            path = "/streaks",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Obtener rachas del usuario",
            description = "Retorna información sobre las rachas del usuario, incluyendo " +
                    "racha actual de días consecutivos y racha más larga alcanzada."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Información de rachas obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = GamificationDtos.StreakInfo.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<GamificationDtos.StreakInfo> getStreaks(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo rachas para usuario: {}", userId);
            
            GamificationDtos.StreakInfo streaks = gamificationService.getStreaks(userId);
            return ResponseEntity.ok(streaks);
        } catch (Exception e) {
            logger.error("Error al obtener rachas", e);
            throw new RuntimeException("Error al obtener rachas", e);
        }
    }

    /**
     * Obtiene los logros desbloqueados por el usuario.
     * 
     * @param request HttpServletRequest para extraer información del usuario
     * @return Lista de logros obtenidos
     */
    @GetMapping(
            path = "/achievements",
            produces = MediaType.APPLICATION_JSON_VALUE
    )
    @Operation(
            summary = "Obtener logros del usuario",
            description = "Retorna lista de logros (badges) desbloqueados por el usuario, " +
                    "incluyendo información de rareza y fecha de desbloqueo."
    )
    @SecurityRequirement(name = "bearerAuth")
    @ApiResponses({
            @ApiResponse(
                    responseCode = "200",
                    description = "Lista de logros obtenida exitosamente",
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(implementation = GamificationDtos.AchievementsResponse.class)
                    )
            ),
            @ApiResponse(responseCode = "401", description = "No autenticado"),
            @ApiResponse(responseCode = "500", description = "Error interno")
    })
    public ResponseEntity<GamificationDtos.AchievementsResponse> getAchievements(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo logros para usuario: {}", userId);
            
            List<GamificationDtos.Achievement> achievements = gamificationService.getAchievements(userId);
            
            GamificationDtos.AchievementsResponse response = new GamificationDtos.AchievementsResponse(
                    achievements,
                    achievements != null ? achievements.size() : 0,
                    0 // TODO: Total disponible cuando se implemente completamente
            );
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener logros", e);
            throw new RuntimeException("Error al obtener logros", e);
        }
    }
}




