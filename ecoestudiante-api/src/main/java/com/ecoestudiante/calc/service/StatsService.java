package com.ecoestudiante.calc.service;

import com.ecoestudiante.auth.TokenUtil;
import com.ecoestudiante.calc.dto.StatsDtos;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Servicio de estadísticas de cálculos CO₂e.
 * 
 * Parte del bounded context de Cálculo.
 * Proporciona estadísticas derivadas de los cálculos realizados por los usuarios.
 * 
 * Movido desde com.ecoestudiante.stats como parte de la reorganización arquitectónica.
 */
@Service
public class StatsService {

    private static final Logger logger = LoggerFactory.getLogger(StatsService.class);
    private final JdbcTemplate jdbc;
    private final TokenUtil tokenUtil;

    public StatsService(JdbcTemplate jdbc, TokenUtil tokenUtil) {
        this.jdbc = jdbc;
        this.tokenUtil = tokenUtil;
        logger.info("StatsService inicializado correctamente");
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

    public StatsDtos.StatsByCategoryResponse getByCategory(String userId, java.util.List<String> categories) {
        UUID userIdUuid = normalizeUserId(userId);
        
        logger.info("getByCategory llamado para usuario: {} con {} categorías filtradas", userId, categories != null ? categories.size() : 0);
        
        // Si no hay filtros, usar método simple
        if (categories == null || categories.isEmpty()) {
            return getByCategorySimple(userIdUuid);
        }
        
        logger.info("=== APLICANDO FILTRO DE CATEGORÍAS EN getByCategory ===");
        logger.info("Categorías recibidas: {}", categories);
        
        // Construir lista de parámetros para la consulta
        java.util.List<Object> params = new java.util.ArrayList<>();
        params.add(userIdUuid);
        
        // Filtrar categorías nulas o vacías
        java.util.List<String> validCategories = categories.stream()
            .filter(cat -> cat != null && !cat.isBlank())
            .collect(java.util.stream.Collectors.toList());
        
        logger.info("Categorías válidas después de filtrar: {}", validCategories);
        
        if (validCategories.isEmpty()) {
            logger.info("No hay categorías válidas, retornando todos los datos");
            return getByCategorySimple(userIdUuid);
        }
        
        // Construir condiciones WHERE dinámicamente basado en categorías y subcategorías
        StringBuilder categoryFilter = new StringBuilder(" AND (");
        java.util.List<String> categoryConditions = new java.util.ArrayList<>();
        
        for (String cat : validCategories) {
            logger.debug("Procesando categoría: {}", cat);
            
            // Si contiene "_", es una subcategoría: "transporte_car_gasoline" o "electricidad_laptop"
            if (cat.contains("_")) {
                String[] parts = cat.split("_", 2);
                if (parts.length == 2) {
                    String mainCategory = parts[0];
                    String subcategory = parts[1];
                    
                    logger.debug("  → Categoría principal: {}, Subcategoría: {}", mainCategory, subcategory);
                    
                    if ("transporte".equals(mainCategory)) {
                        // Subcategoría de transporte: "car_gasoline" o "bus" o "bicycle"
                        if (subcategory.contains("_")) {
                            // Tiene fuelType: "car_gasoline"
                            String[] transportParts = subcategory.split("_", 2);
                            if (transportParts.length == 2) {
                                String mode = transportParts[0];
                                String fuel = transportParts[1];
                                logger.info("    → Modo: '{}', Combustible: '{}'", mode, fuel);
                                logger.info("    → Construyendo condición SQL para transporte con modo y combustible");
                                // Buscar registros que tengan el transportMode y fuelType específicos
                                // Si fuelType no existe en el JSON, será null y no coincidirá (comportamiento correcto)
                                categoryConditions.add("(category = 'transporte' AND input_json->>'transportMode' = ? AND input_json->>'fuelType' = ?)");
                                params.add(mode); // car
                                params.add(fuel); // gasoline
                                logger.info("    → Parámetros agregados: mode='{}', fuel='{}'", mode, fuel);
                            }
                        } else {
                            // Solo modo de transporte: "bus", "bicycle", "walking", etc.
                            logger.debug("    → Solo modo: {}", subcategory);
                            categoryConditions.add("(category = 'transporte' AND input_json->>'transportMode' = ?)");
                            params.add(subcategory);
                        }
                    } else if ("electricidad".equals(mainCategory)) {
                        // Subcategoría de electricidad: "laptop", "celular", etc.
                        logger.debug("    → Appliance: {}", subcategory);
                        categoryConditions.add("(category = 'electricidad' AND ? = ANY(SELECT jsonb_array_elements_text(input_json->'selectedAppliances')))");
                        params.add(subcategory);
                    } else if ("residuos".equals(mainCategory)) {
                        // Subcategoría de residuos: "organic_mixed", "plastic_recycling", etc.
                        // Formato: {wasteType}_{disposalMethod}
                        if (subcategory.contains("_")) {
                            String[] wasteParts = subcategory.split("_", 2);
                            if (wasteParts.length == 2) {
                                String wasteType = wasteParts[0];
                                String disposalMethod = wasteParts[1];
                                logger.info("    → Tipo de residuo: '{}', Método de disposición: '{}'", wasteType, disposalMethod);
                                logger.info("    → Construyendo condición SQL para residuos");
                                // Buscar registros que tengan el wasteType y disposalMethod específicos
                                categoryConditions.add("(category = 'residuos' AND input_json->>'disposalMethod' = ? AND EXISTS (SELECT 1 FROM jsonb_array_elements(input_json->'wasteItems') AS item WHERE item->>'wasteType' = ?))");
                                params.add(disposalMethod);
                                params.add(wasteType);
                                logger.info("    → Parámetros agregados: disposalMethod='{}', wasteType='{}'", disposalMethod, wasteType);
                            }
                        } else {
                            // Solo tipo de residuo sin método de disposición específico (caso poco común)
                            logger.debug("    → Solo tipo de residuo: {}", subcategory);
                            categoryConditions.add("(category = 'residuos' AND EXISTS (SELECT 1 FROM jsonb_array_elements(input_json->'wasteItems') AS item WHERE item->>'wasteType' = ?))");
                            params.add(subcategory);
                        }
                    } else {
                        // Otra categoría con subcategoría (por ahora solo filtrar por categoría principal)
                        logger.debug("    → Otra categoría: {}", mainCategory);
                        categoryConditions.add("category = ?");
                        params.add(mainCategory);
                    }
                }
            } else {
                // Es una categoría principal: "transporte", "electricidad", etc.
                logger.debug("  → Categoría principal sin subcategoría: {}", cat);
                categoryConditions.add("category = ?");
                params.add(cat);
            }
        }
        
        if (!categoryConditions.isEmpty()) {
            categoryFilter.append(String.join(" OR ", categoryConditions));
            categoryFilter.append(")");
            logger.info("✓ Filtro de categorías aplicado con {} condiciones", categoryConditions.size());
            logger.debug("SQL WHERE clause: {}", categoryFilter.toString());
        } else {
            // Si no hay condiciones válidas, retornar datos sin filtrar
            logger.warn("⚠ No se generaron condiciones válidas, retornando todos los datos");
            return getByCategorySimple(userIdUuid);
        }
        
        // Construir WHERE clause con espacios correctos
        String whereClause = "user_id = ?::uuid" + categoryFilter.toString();
        logger.info("WHERE clause completo: {}", whereClause);
        logger.info("Parámetros SQL ({} total): {}", params.size(), params);
        
        // Total general con filtros
        String totalSql = "SELECT COALESCE(SUM(result_kg_co2e), 0) FROM calculation WHERE " + whereClause;
        logger.info("SQL para total: {}", totalSql);
        logger.info("Ejecutando consulta con {} parámetros", params.size());
        
        // Log de parámetros antes de ejecutar
        for (int i = 0; i < params.size(); i++) {
            logger.info("  Parámetro [{}]: {} (tipo: {})", i, params.get(i), params.get(i) != null ? params.get(i).getClass().getSimpleName() : "null");
        }
        
        Double totalKgCO2e = jdbc.queryForObject(totalSql, Double.class, params.toArray());
        double total = totalKgCO2e != null ? totalKgCO2e : 0.0;
        
        logger.info("Total kg CO2e calculado: {}", total);
        
        // Si el total es 0, verificar si hay datos sin filtros
        if (total == 0.0) {
            logger.warn("⚠ Total es 0.0, verificando si hay datos de transporte para este usuario...");
            Long countAll = jdbc.queryForObject(
                "SELECT COUNT(*) FROM calculation WHERE user_id = ?::uuid AND category = 'transporte'",
                Long.class,
                userIdUuid
            );
            logger.info("Total de registros de transporte para este usuario (sin filtros): {}", countAll);
            
            if (countAll != null && countAll > 0) {
                // Verificar qué valores de transportMode y fuelType existen
                java.util.List<java.util.Map<String, Object>> sampleData = jdbc.query(
                    "SELECT input_json->>'transportMode' as mode, input_json->>'fuelType' as fuel " +
                    "FROM calculation " +
                    "WHERE user_id = ?::uuid AND category = 'transporte' " +
                    "LIMIT 10",
                    (rs, rowNum) -> {
                        java.util.Map<String, Object> map = new java.util.HashMap<>();
                        map.put("mode", rs.getString("mode"));
                        map.put("fuel", rs.getString("fuel"));
                        return map;
                    },
                    userIdUuid
                );
                logger.info("Muestra de datos de transporte en BD (primeros 10): {}", sampleData);
            }
        }
        
        // Estadísticas por categoría con filtros - asegurar espacios correctos
        String categorySql = "SELECT " +
            "category, " +
            "SUM(result_kg_co2e) as total, " +
            "COUNT(*) as count " +
            "FROM calculation " +
            "WHERE " + whereClause + " " +
            "GROUP BY category " +
            "ORDER BY total DESC";
        
        logger.info("SQL para categorías: {}", categorySql);
        logger.info("Ejecutando consulta de categorías con {} parámetros", params.size());
        
        List<StatsDtos.CategoryStats> categoryStats = jdbc.query(categorySql,
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
            params.toArray()
        );
        
        logger.info("Estadísticas por categoría obtenidas: {} categorías", categoryStats != null ? categoryStats.size() : 0);
        
        return new StatsDtos.StatsByCategoryResponse(categoryStats, total);
    }
    
    /**
     * Método auxiliar para obtener estadísticas sin filtros (más simple y rápido)
     */
    private StatsDtos.StatsByCategoryResponse getByCategorySimple(UUID userIdUuid) {
        // Total general
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
        
        // Filtro por categorías (puede ser categoría principal o subcategoría)
        if (categories != null && !categories.isEmpty()) {
            logger.info("=== APLICANDO FILTRO DE CATEGORÍAS EN getTimeSeries ===");
            logger.info("Categorías recibidas: {}", categories);
            
            // Filtrar categorías nulas o vacías
            java.util.List<String> validCategories = categories.stream()
                .filter(cat -> cat != null && !cat.isBlank())
                .collect(java.util.stream.Collectors.toList());
            
            logger.info("Categorías válidas después de filtrar: {}", validCategories);
            
            if (!validCategories.isEmpty()) {
                StringBuilder categoryFilter = new StringBuilder(" AND (");
                java.util.List<String> categoryConditions = new java.util.ArrayList<>();
                
                for (String cat : validCategories) {
                    logger.debug("Procesando categoría: {}", cat);
                    
                    // Si contiene "_", es una subcategoría: "transporte_car_gasoline" o "electricidad_laptop"
                    if (cat.contains("_")) {
                        String[] parts = cat.split("_", 2);
                        if (parts.length == 2) {
                            String mainCategory = parts[0];
                            String subcategory = parts[1];
                            
                            logger.debug("  → Categoría principal: {}, Subcategoría: {}", mainCategory, subcategory);
                            
                            if ("transporte".equals(mainCategory)) {
                                // Subcategoría de transporte: "car_gasoline" o "bus" o "bicycle"
                                if (subcategory.contains("_")) {
                                    // Tiene fuelType: "car_gasoline"
                                    String[] transportParts = subcategory.split("_", 2);
                                    if (transportParts.length == 2) {
                                        String mode = transportParts[0];
                                        String fuel = transportParts[1];
                                        logger.info("    → Modo: '{}', Combustible: '{}'", mode, fuel);
                                        logger.info("    → Construyendo condición SQL para transporte con modo y combustible (getTimeSeries)");
                                        // Buscar registros que tengan el transportMode y fuelType específicos
                                        // Si fuelType no existe en el JSON, será null y no coincidirá (comportamiento correcto)
                                        categoryConditions.add("(category = 'transporte' AND input_json->>'transportMode' = ? AND input_json->>'fuelType' = ?)");
                                        params.add(mode); // car
                                        params.add(fuel); // gasoline
                                        logger.info("    → Parámetros agregados: mode='{}', fuel='{}'", mode, fuel);
                                    }
                                } else {
                                    // Solo modo de transporte: "bus", "bicycle", "walking", etc.
                                    logger.debug("    → Solo modo: {}", subcategory);
                                    categoryConditions.add("(category = 'transporte' AND input_json->>'transportMode' = ?)");
                                    params.add(subcategory);
                                }
                            } else if ("electricidad".equals(mainCategory)) {
                                // Subcategoría de electricidad: "laptop", "celular", etc.
                                logger.debug("    → Appliance: {}", subcategory);
                                categoryConditions.add("(category = 'electricidad' AND ? = ANY(SELECT jsonb_array_elements_text(input_json->'selectedAppliances')))");
                                params.add(subcategory);
                            } else if ("residuos".equals(mainCategory)) {
                                // Subcategoría de residuos: "organic_mixed", "plastic_recycling", etc.
                                // Formato: {wasteType}_{disposalMethod}
                                if (subcategory.contains("_")) {
                                    String[] wasteParts = subcategory.split("_", 2);
                                    if (wasteParts.length == 2) {
                                        String wasteType = wasteParts[0];
                                        String disposalMethod = wasteParts[1];
                                        logger.info("    → Tipo de residuo: '{}', Método de disposición: '{}' (getTimeSeries)", wasteType, disposalMethod);
                                        logger.info("    → Construyendo condición SQL para residuos (getTimeSeries)");
                                        // Buscar registros que tengan el wasteType y disposalMethod específicos
                                        categoryConditions.add("(category = 'residuos' AND input_json->>'disposalMethod' = ? AND EXISTS (SELECT 1 FROM jsonb_array_elements(input_json->'wasteItems') AS item WHERE item->>'wasteType' = ?))");
                                        params.add(disposalMethod);
                                        params.add(wasteType);
                                        logger.info("    → Parámetros agregados: disposalMethod='{}', wasteType='{}'", disposalMethod, wasteType);
                                    }
                                } else {
                                    // Solo tipo de residuo sin método de disposición específico (caso poco común)
                                    logger.debug("    → Solo tipo de residuo: {} (getTimeSeries)", subcategory);
                                    categoryConditions.add("(category = 'residuos' AND EXISTS (SELECT 1 FROM jsonb_array_elements(input_json->'wasteItems') AS item WHERE item->>'wasteType' = ?))");
                                    params.add(subcategory);
                                }
                            } else {
                                // Otra categoría con subcategoría (por ahora solo filtrar por categoría principal)
                                logger.debug("    → Otra categoría: {}", mainCategory);
                                categoryConditions.add("category = ?");
                                params.add(mainCategory);
                            }
                        }
                    } else {
                        // Es una categoría principal: "transporte", "electricidad", etc.
                        logger.debug("  → Categoría principal sin subcategoría: {}", cat);
                        categoryConditions.add("category = ?");
                        params.add(cat);
                    }
                }
                
                if (!categoryConditions.isEmpty()) {
                    categoryFilter.append(String.join(" OR ", categoryConditions));
                    categoryFilter.append(")");
                    whereClause.append(categoryFilter);
                    logger.info("✓ Filtro de categorías aplicado con {} condiciones", categoryConditions.size());
                    logger.debug("SQL WHERE clause: {}", whereClause.toString());
                } else {
                    logger.warn("⚠ No se generaron condiciones válidas de categorías");
                }
            } else {
                logger.info("No hay categorías válidas, cargando todos los datos (sin filtro de categorías)");
            }
        } else {
            logger.info("No se proporcionaron categorías, cargando todos los datos (sin filtro de categorías)");
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
        logger.info("=== INICIO getAvailableCategories ===");
        logger.info("userId recibido: {}", userId);
        
        UUID userIdUuid;
        try {
            userIdUuid = normalizeUserId(userId);
            logger.info("userId normalizado a UUID: {}", userIdUuid);
        } catch (Exception e) {
            logger.error("Error normalizando userId: {}", userId, e);
            return new java.util.HashMap<>();
        }
        
        java.util.Map<String, java.util.List<String>> result = new java.util.HashMap<>();
        
        try {
            logger.info("Ejecutando consulta para obtener categorías principales...");
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
            
            logger.info("Categorías principales encontradas: {}", mainCategories != null ? mainCategories.size() : 0);
            if (mainCategories != null && !mainCategories.isEmpty()) {
                logger.info("Lista de categorías: {}", mainCategories);
            } else {
                logger.warn("No se encontraron categorías para el usuario: {}", userIdUuid);
            }
            
            // Validar que mainCategories no sea null
            if (mainCategories == null) {
                logger.warn("mainCategories es null, retornando mapa vacío");
                return result; // Retornar mapa vacío
            }
            
            for (String category : mainCategories) {
                if (category == null) {
                    logger.warn("Categoría nula encontrada, saltando...");
                    continue; // Saltar categorías nulas
                }
                
                logger.info("Procesando categoría: {}", category);
                
                try {
                    if ("transporte".equals(category)) {
                        logger.info("Procesando categoría TRANSPORTE...");
                        
                        // Definir todas las opciones de transporte disponibles en el sistema
                        java.util.Set<String> allTransportOptions = new java.util.HashSet<>();
                        
                        // Modos de transporte base (sin fuelType)
                        allTransportOptions.add("walking");      // Caminando
                        allTransportOptions.add("bicycle");      // Bicicleta
                        allTransportOptions.add("metro");        // Metro/Tren
                        allTransportOptions.add("bus");          // Bus/Transporte Público
                        allTransportOptions.add("motorcycle");   // Motociclista
                        allTransportOptions.add("plane");        // Avión
                        
                        // Opciones de auto con diferentes tipos de combustible
                        allTransportOptions.add("car_gasoline"); // Auto Gasolina
                        allTransportOptions.add("car_diesel");   // Auto Diésel
                        allTransportOptions.add("car_electric"); // Auto Eléctrico
                        allTransportOptions.add("car_hybrid");   // Auto Híbrido
                        
                        logger.info("Opciones de transporte base definidas: {} opciones", allTransportOptions.size());
                        
                        // Obtener subcategorías existentes en los registros del usuario
                        java.util.List<String> userSubcategories = jdbc.query("""
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
                                if (mode != null) {
                                    if (fuel != null && !fuel.isBlank()) {
                                        return mode + "_" + fuel;
                                    }
                                    return mode;
                                }
                                return null;
                            },
                            userIdUuid
                        );
                        
                        logger.info("Subcategorías de transporte encontradas en BD (antes de filtrar): {}", userSubcategories != null ? userSubcategories.size() : 0);
                        
                        // Filtrar nulos de las subcategorías del usuario
                        if (userSubcategories != null) {
                            userSubcategories = userSubcategories.stream()
                                .filter(s -> s != null && !s.isBlank())
                                .collect(java.util.stream.Collectors.toList());
                            logger.info("Subcategorías de transporte del usuario después de filtrar: {}", userSubcategories.size());
                            logger.info("Lista de subcategorías del usuario: {}", userSubcategories);
                            
                            // Agregar las subcategorías del usuario al conjunto de todas las opciones
                            allTransportOptions.addAll(userSubcategories);
                        }
                        
                        // Convertir a lista ordenada para mantener consistencia
                        java.util.List<String> finalSubcategories = new java.util.ArrayList<>(allTransportOptions);
                        java.util.Collections.sort(finalSubcategories);
                        
                        logger.info("Total subcategorías de transporte (base + usuario): {}", finalSubcategories.size());
                        logger.info("Lista completa de subcategorías de transporte: {}", finalSubcategories);
                        
                        result.put(category, finalSubcategories);
                        logger.info("Categoría TRANSPORTE procesada exitosamente. Subcategorías agregadas: {}", 
                            result.get(category).size());
                    } else if ("electricidad".equals(category)) {
                        logger.info("Procesando categoría ELECTRICIDAD...");
                        // Para electricidad, extraer appliances del array JSON
                        java.util.List<String> appliances = java.util.Collections.emptyList();
                        try {
                            logger.info("Ejecutando consulta para obtener appliances de electricidad...");
                            // Obtener todos los registros de electricidad con sus arrays
                            java.util.List<String> jsonArrays = jdbc.query("""
                                SELECT input_json->'selectedAppliances'::text as appliances
                                FROM calculation
                                WHERE user_id = ?::uuid
                                  AND category = 'electricidad'
                                  AND input_json->'selectedAppliances' IS NOT NULL
                                """,
                                (rs, rowNum) -> {
                                    try {
                                        String jsonStr = rs.getString("appliances");
                                        return jsonStr;
                                    } catch (Exception ex) {
                                        logger.warn("Error obteniendo appliances de una fila: {}", ex.getMessage());
                                        return null;
                                    }
                                },
                                userIdUuid
                            );
                            
                            logger.info("Registros de electricidad encontrados: {}", jsonArrays != null ? jsonArrays.size() : 0);
                            if (jsonArrays != null && !jsonArrays.isEmpty()) {
                                logger.info("Primeros 3 registros JSON: {}", jsonArrays.subList(0, Math.min(3, jsonArrays.size())));
                            }
                            
                            // Procesar todos los arrays y extraer appliances únicos
                            java.util.Set<String> appliancesSet = new java.util.HashSet<>();
                            if (jsonArrays != null) {
                                logger.info("Procesando {} registros JSON...", jsonArrays.size());
                                for (int i = 0; i < jsonArrays.size(); i++) {
                                    String jsonStr = jsonArrays.get(i);
                                    if (jsonStr != null && !jsonStr.trim().isEmpty()) {
                                        logger.debug("Procesando registro {} de {}: {}", i + 1, jsonArrays.size(), jsonStr.substring(0, Math.min(100, jsonStr.length())));
                                        
                                        // Limpiar el string JSON
                                        String cleaned = jsonStr.trim();
                                        
                                        // Manejar diferentes formatos de JSON
                                        // Si viene como ["item1","item2"] o como ["item1", "item2"]
                                        if (cleaned.startsWith("[") && cleaned.endsWith("]")) {
                                            cleaned = cleaned.substring(1, cleaned.length() - 1);
                                        }
                                        
                                        // Extraer valores entre comillas dobles (manejar comillas simples también)
                                        java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("[\"']([^\"']+)[\"']");
                                        java.util.regex.Matcher matcher = pattern.matcher(cleaned);
                                        int foundCount = 0;
                                        while (matcher.find()) {
                                            String appliance = matcher.group(1);
                                            if (appliance != null && !appliance.trim().isEmpty()) {
                                                String trimmedAppliance = appliance.trim();
                                                appliancesSet.add(trimmedAppliance);
                                                foundCount++;
                                                logger.debug("  → Appliance extraído: {}", trimmedAppliance);
                                            }
                                        }
                                        
                                        if (foundCount > 0) {
                                            logger.info("Registro {}: Extraídos {} appliances (total único hasta ahora: {})", i + 1, foundCount, appliancesSet.size());
                                        } else {
                                            logger.warn("Registro {}: No se encontraron appliances en: {}", i + 1, jsonStr.substring(0, Math.min(100, jsonStr.length())));
                                        }
                                    } else {
                                        logger.warn("Registro {} es null o vacío", i + 1);
                                    }
                                }
                            }
                            
                            logger.info("Total appliances únicos encontrados: {}", appliancesSet.size());
                            if (!appliancesSet.isEmpty()) {
                                logger.info("Lista de appliances: {}", appliancesSet);
                            }
                            
                            // Convertir a lista ordenada
                            if (!appliancesSet.isEmpty()) {
                                appliances = new java.util.ArrayList<>(appliancesSet);
                                java.util.Collections.sort(appliances);
                                logger.info("Appliances ordenados: {}", appliances);
                            }
                        } catch (Exception e) {
                            logger.error("Error procesando appliances de electricidad: {}", e.getMessage(), e);
                            // Si hay cualquier error, devolver lista vacía (no romper la funcionalidad)
                            appliances = java.util.Collections.emptyList();
                        }
                        result.put(category, appliances != null && !appliances.isEmpty()
                            ? appliances
                            : java.util.Collections.emptyList());
                        logger.info("Categoría ELECTRICIDAD procesada exitosamente. Appliances agregados: {}",
                            result.get(category).size());
                    } else if ("residuos".equals(category)) {
                        logger.info("========== PROCESANDO CATEGORÍA RESIDUOS ==========");

                        // Para residuos, extraer combinaciones de wasteType + disposalMethod
                        java.util.Set<String> wasteSubcategories = new java.util.HashSet<>();

                        try {
                            // Primero verificar si hay datos de residuos
                            Integer countWaste = jdbc.queryForObject(
                                "SELECT COUNT(*) FROM calculation WHERE user_id = ?::uuid AND category = 'residuos'",
                                Integer.class,
                                userIdUuid
                            );
                            logger.info("Total registros de residuos para usuario: {}", countWaste);

                            if (countWaste != null && countWaste > 0) {
                                logger.info("Ejecutando consulta para obtener subcategorías de residuos...");

                                // Obtener wasteItems y disposalMethod de los cálculos de residuos
                                // Usando CTE para mejor legibilidad y debugging
                                java.util.List<String> subcats = jdbc.query("""
                                    WITH waste_data AS (
                                        SELECT
                                            id,
                                            input_json->'wasteItems' as waste_items,
                                            input_json->>'disposalMethod' as disposal_method
                                        FROM calculation
                                        WHERE user_id = ?::uuid
                                          AND category = 'residuos'
                                          AND input_json->'wasteItems' IS NOT NULL
                                    )
                                    SELECT DISTINCT
                                        jsonb_array_elements(waste_items)->>'wasteType' as waste_type,
                                        COALESCE(disposal_method, 'mixed') as disposal_method
                                    FROM waste_data
                                    WHERE jsonb_array_elements(waste_items)->>'wasteType' IS NOT NULL
                                    """,
                                    (rs, rowNum) -> {
                                        String wasteType = rs.getString("waste_type");
                                        String disposalMethod = rs.getString("disposal_method");

                                        logger.debug("Fila {}: wasteType={}, disposalMethod={}",
                                            rowNum + 1, wasteType, disposalMethod);

                                        if (wasteType != null && !wasteType.isBlank()) {
                                            String subcategory = wasteType + "_" + disposalMethod;
                                            logger.debug("  → Subcategoría generada: {}", subcategory);
                                            return subcategory;
                                        }
                                        logger.debug("  → Descartado (wasteType nulo o vacío)");
                                        return null;
                                    },
                                    userIdUuid
                                );

                                logger.info("Subcategorías de residuos retornadas por query: {}", subcats != null ? subcats.size() : 0);

                                // Filtrar nulos y agregar al set
                                if (subcats != null && !subcats.isEmpty()) {
                                    int beforeSize = wasteSubcategories.size();
                                    subcats.stream()
                                        .filter(s -> s != null && !s.isBlank())
                                        .forEach(s -> {
                                            wasteSubcategories.add(s);
                                            logger.debug("  ✓ Agregada: {}", s);
                                        });
                                    logger.info("Subcategorías únicas agregadas: {} (de {} registros)",
                                        wasteSubcategories.size() - beforeSize, subcats.size());
                                    logger.info("Lista completa de subcategorías: {}", wasteSubcategories);
                                } else {
                                    logger.warn("Query no retornó subcategorías (lista vacía o null)");
                                }
                            } else {
                                logger.warn("No hay registros de residuos para este usuario");
                            }

                        } catch (Exception e) {
                            logger.error("========== ERROR PROCESANDO RESIDUOS ==========");
                            logger.error("Mensaje: {}", e.getMessage());
                            logger.error("Stack trace:", e);
                            logger.error("================================================");
                        }

                        // Convertir a lista ordenada
                        java.util.List<String> finalWasteSubcategories = new java.util.ArrayList<>(wasteSubcategories);
                        java.util.Collections.sort(finalWasteSubcategories);

                        result.put(category, finalWasteSubcategories);
                        logger.info("========== RESIDUOS: {} subcategorías finales ==========", finalWasteSubcategories.size());
                        if (!finalWasteSubcategories.isEmpty()) {
                            logger.info("Lista final: {}", finalWasteSubcategories);
                        } else {
                            logger.warn("ADVERTENCIA: No se encontraron subcategorías de residuos");
                        }
                        logger.info("=======================================================");

                    } else {
                        logger.info("Procesando categoría genérica: {}", category);
                        // Para otras categorías, solo agregar la categoría principal
                        result.put(category, java.util.Collections.emptyList());
                        logger.info("Categoría {} procesada (sin subcategorías)", category);
                    }
                } catch (Exception e) {
                    logger.error("Error procesando categoría {}: {}", category, e.getMessage(), e);
                    // Si hay error procesando una categoría, agregar con lista vacía (no romper todo)
                    result.put(category, java.util.Collections.emptyList());
                }
            }
            
            logger.info("=== RESULTADO FINAL getAvailableCategories ===");
            logger.info("Total categorías procesadas: {}", result.size());
            for (java.util.Map.Entry<String, java.util.List<String>> entry : result.entrySet()) {
                logger.info("  - {}: {} subcategorías", entry.getKey(), entry.getValue().size());
                if (!entry.getValue().isEmpty()) {
                    logger.info("    Subcategorías: {}", entry.getValue());
                }
            }
        } catch (Exception e) {
            logger.error("Error general en getAvailableCategories: {}", e.getMessage(), e);
            logger.error("Stack trace completo:", e);
            // Si hay error general, retornar mapa vacío (no romper la funcionalidad)
        }
        
        logger.info("=== FIN getAvailableCategories ===");
        logger.info("Retornando resultado con {} categorías", result.size());
        return result;
    }
}




