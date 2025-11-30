'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { dataZoomConfig, gridConfig, tooltipConfig } from '@/config/echarts-theme';
import { formatTimeSeriesForCSV } from '@/lib/export-utils';

interface TimeSeriesDataPoint {
  period: string;
  emissions: number;
  records: number;
}

interface TimeSeriesBarChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  color?: string;
  className?: string;
}

/**
 * Time Series Bar Chart Component
 *
 * Features:
 * - Vertical bars with gradient fills
 * - Rounded tops
 * - Interactive zoom and pan for large datasets
 * - Enhanced tooltip with period, emissions, and records
 * - Export functionality (PNG + CSV)
 * - Responsive design
 */
export default function TimeSeriesBarChart({
  data,
  title = 'Emisiones por Período',
  loading = false,
  height = 400,
  showExport = true,
  color = '#3b82f6',
  className = '',
}: TimeSeriesBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Initialize chart
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Prepare data for chart
    const periods = data.map((item) => item.period);
    const emissions = data.map((item) => item.emissions);
    const records = data.map((item) => item.records);

    // Create series data with gradient
    const seriesData = emissions.map((value) => ({
      value,
      itemStyle: {
        color: {
          type: 'linear' as const,
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            {
              offset: 0,
              color: color,
            },
            {
              offset: 1,
              color: `${color}CC`, // 80% opacity at bottom
            },
          ],
        },
      },
    }));

    const option = {
      title: {
        text: title,
        left: 'center',
        top: 10,
        textStyle: {
          fontSize: 16,
          fontWeight: 600,
        },
      },
      grid: {
        ...gridConfig,
        bottom: data.length > 10 ? '15%' : '10%',
      },
      tooltip: {
        ...tooltipConfig,
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const dataIndex = params[0].dataIndex;
          const period = periods[dataIndex];
          const emission = emissions[dataIndex];
          const recordCount = records[dataIndex];

          return `
            <div style="padding: 4px 0;">
              <div style="font-weight: 600; margin-bottom: 8px;">${period}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 2px;"></span>
                <span>Emisiones: <strong>${emission.toFixed(2)} kg CO₂e</strong></span>
              </div>
              <div style="color: #6b7280; font-size: 12px;">
                📝 ${recordCount} registro${recordCount !== 1 ? 's' : ''}
              </div>
            </div>
          `;
        },
      },
      xAxis: {
        type: 'category',
        data: periods,
        axisLabel: {
          rotate: periods.length > 12 ? 45 : 0,
          interval: periods.length > 20 ? 'auto' : 0,
        },
      },
      yAxis: {
        type: 'value',
        name: 'kg CO₂e',
        nameTextStyle: {
          padding: [0, 0, 0, 10],
        },
        axisLabel: {
          formatter: (value: number) => {
            if (value >= 1000) {
              return `${(value / 1000).toFixed(1)}k`;
            }
            return value.toFixed(0);
          },
        },
      },
      series: [
        {
          name: 'Emisiones',
          type: 'bar',
          data: seriesData,
          barWidth: data.length > 20 ? '80%' : '60%',
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowOffsetY: 2,
              shadowColor: `${color}60`,
            },
          },
          // Staggered animation
          animationDelay: (idx: number) => idx * 50,
          animationDuration: 1000,
        },
      ],
      // Add zoom controls if there are more than 10 data points
      ...(data.length > 10 && {
        dataZoom: dataZoomConfig,
      }),
    };

    myChart.setOption(option);

    // Handle window resize
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
  }, [data, title, loading, color, height]);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={data}
              csvFormatter={formatTimeSeriesForCSV}
              filename={`emisiones_periodo_${title.toLowerCase().replace(/\s+/g, '_')}`}
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
