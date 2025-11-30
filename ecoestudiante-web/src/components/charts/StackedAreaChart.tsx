'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { dataZoomConfig, gridConfig, legendConfig, tooltipConfig } from '@/config/echarts-theme';
import { formatStackedDataForCSV } from '@/lib/export-utils';
import { getCategoryColor } from '@/config/echarts-theme';

interface StackedDataPoint {
  period: string;
  categories: Record<string, number>;
  total: number;
}

interface StackedAreaChartProps {
  data: StackedDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  className?: string;
}

/**
 * Stacked Area Chart Component
 *
 * Features:
 * - Stacked areas showing category contributions over time
 * - Category-specific colors
 * - Interactive zoom and pan
 * - Tooltip with breakdown and total
 * - Legend for category selection
 * - Export functionality (PNG + CSV)
 */
export default function StackedAreaChart({
  data,
  title = 'Contribución de Categorías en el Tiempo',
  loading = false,
  height = 450,
  showExport = true,
  className = '',
}: StackedAreaChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Initialize chart
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Extract categories from data
    const categories = data.length > 0 ? Object.keys(data[0].categories) : [];

    // Prepare data for chart
    const periods = data.map((item) => item.period);

    // Create series for each category
    const series = categories.map((category) => {
      const categoryData = data.map((item) => item.categories[category] || 0);
      const color = getCategoryColor(category);

      return {
        name: category.charAt(0).toUpperCase() + category.slice(1),
        type: 'line' as const,
        stack: 'Total',
        data: categoryData,
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
                color: `${color}80`, // 50% opacity at top
              },
              {
                offset: 1,
                color: `${color}20`, // 12% opacity at bottom
              },
            ],
          },
        },
        lineStyle: {
          width: 2,
          color,
        },
        itemStyle: {
          color,
        },
        emphasis: {
          focus: 'series' as const,
        },
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
      };
    });

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
        bottom: data.length > 10 ? '20%' : '15%',
      },
      tooltip: {
        ...tooltipConfig,
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          label: {
            backgroundColor: '#6a7985',
          },
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const dataIndex = params[0].dataIndex;
          const period = periods[dataIndex];
          const total = data[dataIndex].total;

          let content = `<div style="padding: 4px 0;">`;
          content += `<div style="font-weight: 600; margin-bottom: 8px;">${period}</div>`;

          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          params.forEach((param: any) => {
            const percentage = total > 0 ? ((param.value / total) * 100).toFixed(1) : '0';
            content += `
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${param.color}; border-radius: 50%;"></span>
                <span>${param.seriesName}: <strong>${param.value.toFixed(2)} kg CO₂e</strong> (${percentage}%)</span>
              </div>
            `;
          });

          content += `
            <div style="border-top: 1px solid #e5e7eb; margin-top: 8px; padding-top: 4px; color: #6b7280; font-size: 12px;">
              Total: <strong>${total.toFixed(2)} kg CO₂e</strong>
            </div>
          </div>`;

          return content;
        },
      },
      legend: {
        ...legendConfig,
        bottom: 5,
        data: series.map((s) => s.name),
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
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
      series,
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
  }, [data, title, loading, height]);

  // Prepare export data
  const categories = data.length > 0 ? Object.keys(data[0].categories) : [];
  const exportData = data.map((item) => ({
    period: item.period,
    ...item.categories,
    total: item.total,
  }));

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={exportData}
              csvFormatter={(data) => formatStackedDataForCSV(data, categories)}
              filename={`contribucion_categorias_${title.toLowerCase().replace(/\s+/g, '_')}`}
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
