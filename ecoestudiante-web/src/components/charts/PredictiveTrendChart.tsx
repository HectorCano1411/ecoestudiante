'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { legendConfig, tooltipConfig } from '@/config/echarts-theme';

interface TimeDataPoint {
  period: string;
  value: number;
}

interface PredictiveTrendChartProps {
  data: TimeDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  className?: string;
  predictMonths?: number; // Meses a predecir hacia el futuro
}

/**
 * Predictive Trend Chart Component
 *
 * Características:
 * - Muestra datos históricos
 * - Calcula regresión lineal para tendencia
 * - Predice valores futuros
 * - Línea de tendencia y área de confianza
 * - Exportación de datos
 */
export default function PredictiveTrendChart({
  data,
  title = 'Tendencias Predictivas',
  loading = false,
  height = 450,
  showExport = true,
  className = '',
  predictMonths = 3,
}: PredictiveTrendChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  // Función de regresión lineal simple
  const linearRegression = (points: number[][]): { slope: number; intercept: number } => {
    const n = points.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;

    points.forEach(([x, y]) => {
      sumX += x;
      sumY += y;
      sumXY += x * y;
      sumX2 += x * x;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    return { slope, intercept };
  };

  // Generar predicciones - memoizada con useCallback para evitar recreaciones innecesarias
  const generatePredictions = useCallback((historicalData: TimeDataPoint[], months: number) => {
    // Convertir datos a puntos numéricos
    const points: number[][] = historicalData.map((d, i) => [i, d.value]);

    // Calcular regresión
    const { slope, intercept } = linearRegression(points);

    // Generar fechas futuras
    const predictions: TimeDataPoint[] = [];
    const lastPeriod = historicalData[historicalData.length - 1].period;
    const [year, month] = lastPeriod.split('-').map(Number);

    for (let i = 1; i <= months; i++) {
      const newMonth = month + i;
      const newYear = year + Math.floor((newMonth - 1) / 12);
      const adjustedMonth = ((newMonth - 1) % 12) + 1;
      const period = `${newYear}-${String(adjustedMonth).padStart(2, '0')}`;

      const predictedValue = slope * (historicalData.length + i - 1) + intercept;
      predictions.push({
        period,
        value: Math.max(0, predictedValue), // No valores negativos
      });
    }

    // Calcular línea de tendencia para datos históricos
    const trendLine: TimeDataPoint[] = historicalData.map((d, i) => ({
      period: d.period,
      value: slope * i + intercept,
    }));

    return { predictions, trendLine, slope };
  }, []);

  useEffect(() => {
    if (!chartRef.current || loading || data.length === 0) return;

    // Inicializar gráfico
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Generar predicciones
    const { predictions, trendLine, slope } = generatePredictions(data, predictMonths);

    // Combinar datos
    const allPeriods = [...data.map(d => d.period), ...predictions.map(p => p.period)];
    const historicalValues = [...data.map(d => d.value), ...new Array(predictions.length).fill(null)];
    const predictedValues = [...new Array(data.length).fill(null), ...predictions.map(p => p.value)];
    const trendLineValues = [...trendLine.map(t => t.value), ...predictions.map(p => p.value)];

    // Calcular intervalo de confianza (simplificado)
    const avgError = data.reduce((sum, d, i) => sum + Math.abs(d.value - trendLine[i].value), 0) / data.length;
    const upperBound = trendLineValues.map(v => v ? v + avgError * 1.5 : null);
    const lowerBound = trendLineValues.map(v => v ? Math.max(0, v - avgError * 1.5) : null);

    const option = {
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 18,
          fontWeight: 600,
        },
      },
      tooltip: {
        ...tooltipConfig,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
        },
      },
      legend: {
        ...legendConfig,
        bottom: 0,
        data: ['Datos Históricos', 'Predicción', 'Tendencia', 'Intervalo de Confianza'],
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '15%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: allPeriods,
        boundaryGap: false,
        axisLine: {
          lineStyle: {
            color: '#6b7280',
          },
        },
        splitLine: {
          show: true,
          lineStyle: {
            type: 'dashed',
            color: '#e5e7eb',
          },
        },
      },
      yAxis: {
        type: 'value',
        name: 'Valor',
        axisLine: {
          lineStyle: {
            color: '#6b7280',
          },
        },
        splitLine: {
          lineStyle: {
            type: 'dashed',
            color: '#e5e7eb',
          },
        },
      },
      series: [
        // Intervalo de confianza (área)
        {
          name: 'Intervalo de Confianza',
          type: 'line',
          data: upperBound,
          lineStyle: {
            opacity: 0,
          },
          stack: 'confidence',
          symbol: 'none',
          areaStyle: {
            color: 'rgba(147, 197, 253, 0.2)',
          },
        },
        {
          name: 'Intervalo de Confianza Lower',
          type: 'line',
          data: lowerBound,
          lineStyle: {
            opacity: 0,
          },
          stack: 'confidence',
          symbol: 'none',
          areaStyle: {
            color: 'rgba(255, 255, 255, 0.5)',
          },
          tooltip: {
            show: false,
          },
        },
        // Datos históricos
        {
          name: 'Datos Históricos',
          type: 'line',
          data: historicalValues,
          smooth: true,
          itemStyle: {
            color: '#3b82f6',
          },
          lineStyle: {
            width: 3,
          },
          symbol: 'circle',
          symbolSize: 8,
          emphasis: {
            itemStyle: {
              borderColor: '#3b82f6',
              borderWidth: 2,
            },
          },
        },
        // Predicción
        {
          name: 'Predicción',
          type: 'line',
          data: predictedValues,
          smooth: true,
          itemStyle: {
            color: '#10b981',
          },
          lineStyle: {
            width: 3,
            type: 'dashed',
          },
          symbol: 'diamond',
          symbolSize: 8,
        },
        // Línea de tendencia
        {
          name: 'Tendencia',
          type: 'line',
          data: trendLineValues,
          smooth: false,
          itemStyle: {
            color: '#f59e0b',
          },
          lineStyle: {
            width: 2,
            type: 'dotted',
          },
          symbol: 'none',
        },
      ],
      graphic: [
        {
          type: 'text',
          left: 'center',
          bottom: '5%',
          style: {
            text: slope > 0 ? '📈 Tendencia Creciente' : slope < 0 ? '📉 Tendencia Decreciente' : '➡️ Tendencia Estable',
            fontSize: 14,
            fontWeight: 600,
            fill: slope > 0 ? '#10b981' : slope < 0 ? '#ef4444' : '#6b7280',
          },
        },
      ],
    };

    myChart.setOption(option);

    // Manejar redimensionamiento
    const handleResize = () => {
      myChart.resize();
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      myChart.dispose();
      setChartInstance(null);
    };
  }, [data, title, loading, height, predictMonths, generatePredictions]);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={data}
              filename={`tendencias_predictivas_${title.toLowerCase().replace(/\s+/g, '_')}`}
            />
          </div>
        )}

        <div
          ref={chartRef}
          style={{
            width: '100%',
            height: typeof height === 'number' ? `${height}px` : height,
          }}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75">
            <div className="animate-pulse text-gray-600 font-medium">Cargando gráfico...</div>
          </div>
        )}

        {data.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">No hay datos disponibles</p>
          </div>
        )}
      </div>
    </div>
  );
}
