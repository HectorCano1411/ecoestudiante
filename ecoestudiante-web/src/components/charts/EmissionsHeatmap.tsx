'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { formatHeatmapDataForCSV } from '@/lib/export-utils';

interface HeatmapDataPoint {
  date: string; // YYYY-MM-DD format
  value: number;
}

interface EmissionsHeatmapProps {
  data: HeatmapDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  year?: number;
  className?: string;
}

/**
 * Emissions Heatmap Component
 *
 * Features:
 * - Calendar-style heatmap visualization
 * - Color scale based on emission values
 * - Daily emission tracking
 * - Tooltip with date and value
 * - Export functionality (PNG + CSV)
 */
export default function EmissionsHeatmap({
  data,
  title = 'Calendario de Emisiones',
  loading = false,
  height = 200,
  showExport = true,
  year = new Date().getFullYear(),
  className = '',
}: EmissionsHeatmapProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Initialize chart
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Prepare data for heatmap
    const heatmapData = data.map((item) => {
      return [item.date, item.value];
    });

    // Calculate max value for visual map
    const maxValue = Math.max(...data.map((item) => item.value), 1);

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
      tooltip: {
        trigger: 'item',
        confine: true,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          fontSize: 12,
        },
        position: 'top',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const [date, value] = params.data;
          const dateObj = new Date(date);
          const dateString = dateObj.toLocaleDateString('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          });

          return `
            <div style="padding: 4px 0;">
              <div style="font-weight: 600; margin-bottom: 8px;">${dateString}</div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span>💨 <strong>${value.toFixed(2)} kg CO₂e</strong></span>
              </div>
            </div>
          `;
        },
      },
      visualMap: {
        min: 0,
        max: maxValue,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: 10,
        inRange: {
          color: ['#f0fdf4', '#86efac', '#10b981', '#047857', '#064e3b'],
        },
        text: ['Alto', 'Bajo'],
        textStyle: {
          fontSize: 12,
        },
      },
      calendar: {
        top: 80,
        left: 40,
        right: 20,
        cellSize: ['auto', 15],
        range: year,
        itemStyle: {
          borderWidth: 2,
          borderColor: '#fff',
        },
        yearLabel: {
          show: true,
          fontSize: 14,
          fontWeight: 600,
        },
        monthLabel: {
          nameMap: 'ES',
          fontSize: 12,
        },
        dayLabel: {
          nameMap: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
          fontSize: 11,
        },
      },
      series: [
        {
          type: 'heatmap',
          coordinateSystem: 'calendar',
          data: heatmapData,
        },
      ],
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
  }, [data, title, loading, year, height]);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={data}
              csvFormatter={formatHeatmapDataForCSV}
              filename={`emisiones_calendario_${year}`}
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
