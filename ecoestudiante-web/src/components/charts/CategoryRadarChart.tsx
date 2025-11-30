'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { tooltipConfig } from '@/config/echarts-theme';
import { formatRadarDataForCSV } from '@/lib/export-utils';
import { getCategoryColor } from '@/config/echarts-theme';

interface RadarDataPoint {
  name: string;
  value: number;
  max?: number;
}

interface CategoryRadarChartProps {
  data: RadarDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  color?: string;
  className?: string;
}

/**
 * Category Radar Chart Component
 *
 * Features:
 * - Polygon/spider chart for category comparison
 * - Semi-transparent filled area
 * - Multiple axes (one per category)
 * - Visual balance comparison
 * - Export functionality (PNG + CSV)
 */
export default function CategoryRadarChart({
  data,
  title = 'Balance de Categorías',
  loading = false,
  height = 450,
  showExport = true,
  color = '#10b981',
  className = '',
}: CategoryRadarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Initialize chart
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Calculate max value for each indicator
    const maxValue = Math.max(...data.map((item) => item.max || item.value), 1);

    // Prepare radar indicators
    const indicators = data.map((item) => ({
      name: item.name.charAt(0).toUpperCase() + item.name.slice(1),
      max: item.max || maxValue * 1.2, // Add 20% padding
      color: getCategoryColor(item.name),
    }));

    // Prepare series data
    const seriesData = [
      {
        value: data.map((item) => item.value),
        name: 'Emisiones por Categoría',
      },
    ];

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
        ...tooltipConfig,
        trigger: 'item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const radarData = params.value;
          let content = `<div style="padding: 4px 0;">`;
          content += `<div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>`;

          data.forEach((item, index) => {
            const value = radarData[index];
            const max = item.max || maxValue * 1.2;
            const percentage = ((value / max) * 100).toFixed(1);
            const categoryColor = getCategoryColor(item.name);

            content += `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${categoryColor}; border-radius: 50%;"></span>
                <span>${item.name.charAt(0).toUpperCase() + item.name.slice(1)}: <strong>${value.toFixed(2)} kg CO₂e</strong></span>
              </div>
              <div style="color: #6b7280; font-size: 11px; margin-left: 18px; margin-bottom: 6px;">
                ${percentage}% del máximo
              </div>
            `;
          });

          content += `</div>`;
          return content;
        },
      },
      legend: {
        bottom: 5,
        data: ['Emisiones por Categoría'],
      },
      radar: {
        center: ['50%', '55%'],
        radius: '65%',
        indicator: indicators,
        axisName: {
          color: '#6b7280',
          fontSize: 12,
          fontWeight: 500,
        },
        splitArea: {
          show: true,
          areaStyle: {
            color: ['rgba(16, 185, 129, 0.05)', 'rgba(16, 185, 129, 0.02)'],
          },
        },
        splitLine: {
          lineStyle: {
            color: 'rgba(16, 185, 129, 0.2)',
          },
        },
        axisLine: {
          lineStyle: {
            color: 'rgba(16, 185, 129, 0.3)',
          },
        },
      },
      series: [
        {
          name: 'Emisiones por Categoría',
          type: 'radar',
          data: seriesData,
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
              type: 'radial' as const,
              x: 0.5,
              y: 0.5,
              r: 0.5,
              colorStops: [
                {
                  offset: 0,
                  color: `${color}40`, // 25% opacity at center
                },
                {
                  offset: 1,
                  color: `${color}20`, // 12% opacity at edge
                },
              ],
            },
          },
          emphasis: {
            lineStyle: {
              width: 4,
            },
            itemStyle: {
              shadowBlur: 10,
              shadowColor: `${color}80`,
            },
          },
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
  }, [data, title, loading, color, height]);

  // Prepare export data with max values
  const maxValue = Math.max(...data.map((item) => item.max || item.value), 1);
  const exportData = data.map((item) => ({
    ...item,
    max: item.max || maxValue * 1.2,
  }));

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={exportData}
              csvFormatter={formatRadarDataForCSV}
              filename={`balance_categorias_${title.toLowerCase().replace(/\s+/g, '_')}`}
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
