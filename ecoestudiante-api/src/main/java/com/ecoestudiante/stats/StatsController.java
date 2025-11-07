package com.ecoestudiante.stats;

import com.ecoestudiante.auth.UserContextResolver;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/stats")
@Tag(name = "Statistics", description = "Estadísticas de huella de carbono")
public class StatsController {

    private static final Logger logger = LoggerFactory.getLogger(StatsController.class);
    private final StatsService statsService;
    private final UserContextResolver userContextResolver;

    public StatsController(StatsService statsService, UserContextResolver userContextResolver) {
        this.statsService = statsService;
        this.userContextResolver = userContextResolver;
    }

    @GetMapping("/summary")
    @Operation(
        summary = "Obtener resumen de estadísticas",
        description = "Retorna estadísticas generales del usuario autenticado"
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<StatsDtos.StatsSummary> getSummary(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo estadísticas para usuario: {}", userId);
            StatsDtos.StatsSummary summary = statsService.getSummary(userId);
            return ResponseEntity.ok(summary);
        } catch (Exception e) {
            logger.error("Error al obtener estadísticas", e);
            throw new RuntimeException("Error al obtener estadísticas", e);
        }
    }

    @GetMapping("/by-category")
    @Operation(
        summary = "Obtener estadísticas por categoría",
        description = "Retorna estadísticas agrupadas por categoría de emisión"
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<StatsDtos.StatsByCategoryResponse> getByCategory(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo estadísticas por categoría para usuario: {}", userId);
            StatsDtos.StatsByCategoryResponse response = statsService.getByCategory(userId);
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener estadísticas por categoría", e);
            throw new RuntimeException("Error al obtener estadísticas por categoría", e);
        }
    }

    @GetMapping("/time-series")
    @Operation(
        summary = "Obtener datos temporales para gráficos",
        description = "Retorna datos agrupados por mes o día para visualización en gráficos temporales con filtros opcionales"
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<StatsDtos.TimeSeriesResponse> getTimeSeries(
            HttpServletRequest request,
            @RequestParam(value = "groupBy", defaultValue = "month") String groupBy,
            @RequestParam(value = "months", required = false) Integer months,
            @RequestParam(value = "schedule", required = false) String schedule,
            @RequestParam(value = "career", required = false) String career,
            @RequestParam(value = "month", required = false) Integer month,
            @RequestParam(value = "day", required = false) Integer day,
            @RequestParam(value = "categories", required = false) java.util.List<String> categories
    ) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo datos temporales para usuario: {}, groupBy: {}, months: {}, schedule: {}, career: {}, month: {}, day: {}, categories: {}", 
                userId, groupBy, months, schedule, career, month, day, categories);
            StatsDtos.TimeSeriesResponse response = statsService.getTimeSeries(
                userId, groupBy, months, schedule, career, month, day, categories
            );
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error al obtener datos temporales", e);
            throw new RuntimeException("Error al obtener datos temporales", e);
        }
    }
    
    @GetMapping("/available-careers")
    @Operation(
        summary = "Obtener lista de carreras disponibles",
        description = "Retorna lista de carreras únicas del usuario para usar en filtros"
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<java.util.List<String>> getAvailableCareers(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo carreras disponibles para usuario: {}", userId);
            java.util.List<String> careers = statsService.getAvailableCareers(userId);
            return ResponseEntity.ok(careers);
        } catch (Exception e) {
            logger.error("Error al obtener carreras disponibles", e);
            throw new RuntimeException("Error al obtener carreras disponibles", e);
        }
    }
    
    @GetMapping("/available-categories")
    @Operation(
        summary = "Obtener categorías y subcategorías disponibles",
        description = "Retorna mapa de categorías y sus subcategorías disponibles del usuario"
    )
    @SecurityRequirement(name = "bearerAuth")
    public ResponseEntity<java.util.Map<String, java.util.List<String>>> getAvailableCategories(HttpServletRequest request) {
        try {
            String userId = userContextResolver.resolve(request).normalizedUserIdAsString();
            logger.info("Obteniendo categorías disponibles para usuario: {}", userId);
            java.util.Map<String, java.util.List<String>> categories = statsService.getAvailableCategories(userId);
            return ResponseEntity.ok(categories);
        } catch (Exception e) {
            logger.error("Error al obtener categorías disponibles", e);
            throw new RuntimeException("Error al obtener categorías disponibles", e);
        }
    }
}

