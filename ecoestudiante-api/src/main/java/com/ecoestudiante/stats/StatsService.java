package com.ecoestudiante.stats;

import com.ecoestudiante.auth.TokenUtil;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class StatsService {

    private final JdbcTemplate jdbc;
    private final TokenUtil tokenUtil;

    public StatsService(JdbcTemplate jdbc, TokenUtil tokenUtil) {
        this.jdbc = jdbc;
        this.tokenUtil = tokenUtil;
    }

    /**
     * Normaliza userId a UUID válido usando TokenUtil.
     */
    private UUID normalizeUserId(String userId) {
        return tokenUtil.normalizeUserIdToUuid(userId);
    }

    public StatsDtos.StatsSummary getSummary(String userId) {
        UUID userIdUuid = normalizeUserId(userId);
        
        // Total general
        Double totalKgCO2e = jdbc.queryForObject(
            "SELECT COALESCE(SUM(result_kg_co2e), 0) FROM calculation WHERE user_id = ?::uuid",
            Double.class, userIdUuid
        );
        
        // Total de registros
        Long totalRecords = jdbc.queryForObject(
            "SELECT COUNT(*) FROM calculation WHERE user_id = ?::uuid",
            Long.class, userIdUuid
        );
        
        // Este mes
        Double thisMonth = jdbc.queryForObject("""
            SELECT COALESCE(SUM(result_kg_co2e), 0)
            FROM calculation
            WHERE user_id = ?::uuid
              AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE)
            """,
            Double.class, userIdUuid
        );
        
        // Mes anterior
        Double lastMonthKg = jdbc.queryForObject("""
            SELECT COALESCE(SUM(result_kg_co2e), 0)
            FROM calculation
            WHERE user_id = ?::uuid
              AND DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
            """,
            Double.class, userIdUuid
        );
        
        // Promedio mensual (últimos 12 meses)
        Double avgMonthly = jdbc.queryForObject("""
            SELECT COALESCE(
              AVG(monthly_total),
              0
            ) FROM (
              SELECT SUM(result_kg_co2e) as monthly_total
              FROM calculation
              WHERE user_id = ?::uuid
                AND created_at >= CURRENT_DATE - INTERVAL '12 months'
              GROUP BY DATE_TRUNC('month', created_at)
            ) monthly_stats
            """,
            Double.class, userIdUuid
        );
        
        return new StatsDtos.StatsSummary(
            totalKgCO2e != null ? totalKgCO2e : 0.0,
            totalRecords != null ? totalRecords : 0L,
            thisMonth != null ? thisMonth : 0.0,
            lastMonthKg != null ? lastMonthKg : 0.0,
            avgMonthly != null ? avgMonthly : 0.0,
            LocalDateTime.now()
        );
    }

    public StatsDtos.StatsByCategoryResponse getByCategory(String userId) {
        UUID userIdUuid = normalizeUserId(userId);
        
        // Total general primero
        Double totalKgCO2e = jdbc.queryForObject(
            "SELECT COALESCE(SUM(result_kg_co2e), 0) FROM calculation WHERE user_id = ?::uuid",
            Double.class, userIdUuid
        );
        
        double total = totalKgCO2e != null ? totalKgCO2e : 0.0;
        
        // Estadísticas por categoría
        List<StatsDtos.CategoryStats> categories = jdbc.query("""
            SELECT 
              category,
              SUM(result_kg_co2e) as total,
              COUNT(*) as count
            FROM calculation
            WHERE user_id = ?::uuid
            GROUP BY category
            ORDER BY total DESC
            """,
            (rs, rowNum) -> {
                String category = rs.getString("category");
                double catTotal = rs.getDouble("total");
                long count = rs.getLong("count");
                double percentage = total > 0 ? (catTotal / total) * 100 : 0.0;
                
                return new StatsDtos.CategoryStats(
                    category,
                    catTotal,
                    count,
                    percentage
                );
            },
            userIdUuid
        );
        
        return new StatsDtos.StatsByCategoryResponse(categories, total);
    }

    /**
     * Obtiene datos temporales agrupados por mes o día con filtros opcionales.
     * 
     * @param userId ID del usuario
     * @param groupBy Tipo de agrupación: "month" o "day"
     * @param months Número de meses hacia atrás (por defecto 12)
     * @param schedule Filtro por jornada: "diurna" o "vespertina" (opcional)
     * @param career Filtro por carrera (opcional)
     * @param month Filtro por mes del año (1-12) (opcional)
     * @param day Filtro por día del mes (1-31) (opcional)
     * @return Respuesta con datos temporales
     */
    public StatsDtos.TimeSeriesResponse getTimeSeries(
            String userId, 
            String groupBy, 
            Integer months,
            String schedule,
            String career,
            Integer month,
            Integer day,
            java.util.List<String> categories
    ) {
        UUID userIdUuid = normalizeUserId(userId);
        
        if (months == null || months <= 0) {
            months = 12; // Por defecto últimos 12 meses
        }
        
        // Limitar a máximo 24 meses para evitar consultas muy pesadas
        if (months > 24) {
            months = 24;
        }
        
        String dateFormat;
        String dateTrunc;
        
        if ("day".equalsIgnoreCase(groupBy)) {
            dateFormat = "YYYY-MM-DD";
            dateTrunc = "day";
            // Para días, limitar a últimos 90 días
            if (months > 3) {
                months = 3;
            }
        } else {
            // Por defecto agrupar por mes
            dateFormat = "YYYY-MM";
            dateTrunc = "month";
        }
        
        // Construir condiciones WHERE dinámicamente
        StringBuilder whereClause = new StringBuilder("user_id = ?::uuid");
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(userIdUuid);
        
        // Filtro por fecha base
        whereClause.append(" AND created_at >= CURRENT_DATE - INTERVAL '").append(months).append(" months'");
        
        // Filtro por jornada (schedule)
        if (schedule != null && !schedule.isBlank()) {
            whereClause.append(" AND input_json->>'schedule' = ?");
            params.add(schedule);
        }
        
        // Filtro por carrera
        if (career != null && !career.isBlank()) {
            whereClause.append(" AND input_json->>'career' = ?");
            params.add(career);
        }
        
        // Filtro por mes del año (1-12)
        if (month != null && month >= 1 && month <= 12) {
            whereClause.append(" AND EXTRACT(MONTH FROM created_at) = ?");
            params.add(month);
        }
        
        // Filtro por día del mes (1-31)
        if (day != null && day >= 1 && day <= 31) {
            whereClause.append(" AND EXTRACT(DAY FROM created_at) = ?");
            params.add(day);
        }
        
        // Filtro por categorías (puede ser categoría principal o subcategoría de transporte)
        if (categories != null && !categories.isEmpty()) {
            StringBuilder categoryFilter = new StringBuilder(" AND (");
            for (int i = 0; i < categories.size(); i++) {
                if (i > 0) categoryFilter.append(" OR ");
                String cat = categories.get(i);
                // Si contiene "_", es una subcategoría de transporte
                if (cat.contains("_")) {
                    String[] parts = cat.split("_", 2);
                    if (parts.length == 2) {
                        categoryFilter.append("(category = 'transporte' AND input_json->>'transportMode' = ? AND input_json->>'fuelType' = ?)");
                        params.add(parts[0]);
                        params.add(parts[1]);
                    } else {
                        categoryFilter.append("category = ?");
                        params.add(cat);
                    }
                } else {
                    categoryFilter.append("category = ?");
                    params.add(cat);
                }
            }
            categoryFilter.append(")");
            whereClause.append(categoryFilter);
        }
        
        // Total general con filtros aplicados
        StringBuilder totalQuery = new StringBuilder(
            "SELECT COALESCE(SUM(result_kg_co2e), 0) FROM calculation WHERE "
        );
        totalQuery.append(whereClause);
        
        Double totalKgCO2e = jdbc.queryForObject(
            totalQuery.toString(),
            Double.class,
            params.toArray()
        );
        double total = totalKgCO2e != null ? totalKgCO2e : 0.0;
        
        // Obtener datos temporales con filtros
        String dataQuery = String.format("""
            SELECT 
              TO_CHAR(DATE_TRUNC('%s', created_at), '%s') as period,
              SUM(result_kg_co2e) as total,
              COUNT(*) as count
            FROM calculation
            WHERE %s
            GROUP BY DATE_TRUNC('%s', created_at)
            ORDER BY period ASC
            """, dateTrunc, dateFormat, whereClause.toString(), dateTrunc);
        
        List<StatsDtos.TimeSeriesDataPoint> data = jdbc.query(
            dataQuery,
            (rs, rowNum) -> {
                String period = rs.getString("period");
                double periodTotal = rs.getDouble("total");
                long count = rs.getLong("count");
                
                return new StatsDtos.TimeSeriesDataPoint(
                    period,
                    periodTotal,
                    count,
                    null // No agrupamos por categoría en este endpoint
                );
            },
            params.toArray()
        );
        
        return new StatsDtos.TimeSeriesResponse(data, groupBy, total);
    }
    
    /**
     * Obtiene lista de carreras únicas del usuario para el filtro.
     */
    public java.util.List<String> getAvailableCareers(String userId) {
        UUID userIdUuid = normalizeUserId(userId);
        
        return jdbc.query("""
            SELECT DISTINCT input_json->>'career' as career
            FROM calculation
            WHERE user_id = ?::uuid
              AND input_json->>'career' IS NOT NULL
              AND input_json->>'career' != ''
            ORDER BY career ASC
            """,
            (rs, rowNum) -> rs.getString("career"),
            userIdUuid
        );
    }
    
    /**
     * Obtiene todas las categorías y subcategorías disponibles del usuario.
     * Retorna un mapa con categoría como clave y lista de subcategorías como valor.
     */
    public java.util.Map<String, java.util.List<String>> getAvailableCategories(String userId) {
        UUID userIdUuid = normalizeUserId(userId);
        
        // Obtener categorías principales
        java.util.List<String> mainCategories = jdbc.query("""
            SELECT DISTINCT category
            FROM calculation
            WHERE user_id = ?::uuid
            ORDER BY category ASC
            """,
            (rs, rowNum) -> rs.getString("category"),
            userIdUuid
        );
        
        java.util.Map<String, java.util.List<String>> result = new java.util.HashMap<>();
        
        for (String category : mainCategories) {
            if ("transporte".equals(category)) {
                // Para transporte, obtener subcategorías del input_json
                java.util.List<String> subcategories = jdbc.query("""
                    SELECT DISTINCT input_json->>'transportMode' as transport_mode,
                           input_json->>'fuelType' as fuel_type
                    FROM calculation
                    WHERE user_id = ?::uuid
                      AND category = 'transporte'
                    ORDER BY transport_mode, fuel_type
                    """,
                    (rs, rowNum) -> {
                        String mode = rs.getString("transport_mode");
                        String fuel = rs.getString("fuel_type");
                        if (fuel != null && !fuel.isBlank()) {
                            return mode + "_" + fuel;
                        }
                        return mode;
                    },
                    userIdUuid
                );
                result.put(category, subcategories);
            } else {
                // Para otras categorías, solo agregar la categoría principal
                result.put(category, java.util.Collections.emptyList());
            }
        }
        
        return result;
    }
}

