package com.ecoestudiante.stats;

import io.swagger.v3.oas.annotations.media.Schema;
import java.time.LocalDateTime;
import java.util.Map;

public final class StatsDtos {

    public record StatsSummary(
            @Schema(description = "Total de kg CO₂e registrados")
            double totalKgCO2e,
            
            @Schema(description = "Total de registros")
            long totalRecords,
            
            @Schema(description = "Total de este mes")
            double thisMonthKgCO2e,
            
            @Schema(description = "Total del mes anterior")
            double lastMonthKgCO2e,
            
            @Schema(description = "Promedio mensual")
            double averagePerMonth,
            
            @Schema(description = "Fecha del cálculo")
            LocalDateTime calculatedAt
    ) {}

    public record CategoryStats(
            @Schema(description = "Categoría")
            String category,
            
            @Schema(description = "Total en kg CO₂e")
            double totalKgCO2e,
            
            @Schema(description = "Número de registros")
            long recordCount,
            
            @Schema(description = "Porcentaje del total")
            double percentage
    ) {}

    public record StatsByCategoryResponse(
            @Schema(description = "Lista de estadísticas por categoría")
            java.util.List<CategoryStats> categories,
            
            @Schema(description = "Total general")
            double totalKgCO2e
    ) {}

    public record TimeSeriesDataPoint(
            @Schema(description = "Fecha o período (formato YYYY-MM o YYYY-MM-DD)")
            String period,
            
            @Schema(description = "Total en kg CO₂e")
            double totalKgCO2e,
            
            @Schema(description = "Número de registros")
            long recordCount,
            
            @Schema(description = "Categoría (opcional, para datos agrupados por categoría)")
            String category
    ) {}

    public record TimeSeriesResponse(
            @Schema(description = "Lista de puntos de datos temporales")
            java.util.List<TimeSeriesDataPoint> data,
            
            @Schema(description = "Tipo de agrupación: 'month' o 'day'")
            String groupBy,
            
            @Schema(description = "Total general")
            double totalKgCO2e
    ) {}
}

