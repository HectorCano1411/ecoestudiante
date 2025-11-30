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

interface TimeSeriesLineChartProps {
  data: TimeSeriesDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  color?: string;
  className?: string;
}

/**
 * Time Series Line Chart Component
 *
 * Features:
 * - Smooth line with gradient area fill
 * - Interactive zoom and pan
 * - Enhanced tooltip with period, emissions, and records
 * - Export functionality (PNG + CSV)
 * - Responsive design
 */
export default function TimeSeriesLineChart({
  data,
  title = 'Emisiones en el Tiempo',
  loading = false,
  height = 400,
  showExport = true,
  color = '#10b981',
  className = '',
}: TimeSeriesLineChartProps) {
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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const dataIndex = params.dataIndex;
          const period = periods[dataIndex];
          const emission = emissions[dataIndex];
          const recordCount = records[dataIndex];

          return `
            <div style="padding: 4px 0;">
              <div style="font-weight: 600; margin-bottom: 8px;">${period}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
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
        boundaryGap: false,
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
          type: 'line',
          data: emissions,
          smooth: true,
          symbol: 'circle',
          symbolSize: 6,
          lineStyle: {
            width: 3,
            color,
          },
          itemStyle: {
            color,
            borderWidth: 2,
            borderColor: '#fff',
          },
          areaStyle: {
            color: {
              type: 'linear' as const,
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                {
                  offset: 0,
                  color: `${color}40`, // 25% opacity at top
                },
                {
                  offset: 1,
                  color: `${color}08`, // 3% opacity at bottom
                },
              ],
            },
          },
          emphasis: {
            focus: 'series',
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowOffsetY: 2,
              shadowColor: `${color}60`,
            },
          },
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
              filename={`emisiones_tiempo_${title.toLowerCase().replace(/\s+/g, '_')}`}
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
