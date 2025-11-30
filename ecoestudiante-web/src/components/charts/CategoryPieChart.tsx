'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { legendConfig, tooltipConfig } from '@/config/echarts-theme';
import { formatCategoryDataForCSV } from '@/lib/export-utils';
import { getCategoryColor } from '@/config/echarts-theme';

interface CategoryDataPoint {
  name: string;
  value: number;
  records?: number;
}

interface CategoryPieChartProps {
  data: CategoryDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  className?: string;
}

// Category icons mapping
const CATEGORY_ICONS: Record<string, string> = {
  electricidad: '⚡',
  transporte: '🚗',
  residuos: '♻️',
  agua: '💧',
  alimentos: '🍎',
  gas: '🔥',
};

/**
 * Category Pie Chart Component
 *
 * Features:
 * - Donut chart design with inner radius
 * - Labels with percentages on arcs
 * - Category-specific icons and colors
 * - Staggered animation
 * - Scrollable legend
 * - Export functionality (PNG + CSV)
 */
export default function CategoryPieChart({
  data,
  title = 'Emisiones por Categoría',
  loading = false,
  height = 450,
  showExport = true,
  className = '',
}: CategoryPieChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Initialize chart
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Calculate total for percentages
    const total = data.reduce((sum, item) => sum + item.value, 0);

    // Prepare data with colors and icons
    const chartData = data.map((item) => {
      const categoryKey = item.name.toLowerCase();
      const icon = CATEGORY_ICONS[categoryKey] || '📊';
      const color = getCategoryColor(categoryKey);

      return {
        name: `${icon} ${item.name}`,
        value: item.value,
        records: item.records || 0,
        itemStyle: {
          color,
        },
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
      tooltip: {
        ...tooltipConfig,
        trigger: 'item',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const percentage = ((params.value / total) * 100).toFixed(1);
          const records = params.data.records || 0;

          return `
            <div style="padding: 4px 0;">
              <div style="font-weight: 600; margin-bottom: 8px;">${params.name}</div>
              <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <span style="display: inline-block; width: 10px; height: 10px; background: ${params.color}; border-radius: 50%;"></span>
                <span>Emisiones: <strong>${params.value.toFixed(2)} kg CO₂e</strong></span>
              </div>
              <div style="color: #6b7280; font-size: 12px; margin-bottom: 4px;">
                📊 ${percentage}% del total
              </div>
              <div style="color: #6b7280; font-size: 12px;">
                📝 ${records} registro${records !== 1 ? 's' : ''}
              </div>
            </div>
          `;
        },
      },
      legend: {
        ...legendConfig,
        bottom: 0,
        type: 'scroll',
        data: chartData.map((item) => item.name),
      },
      series: [
        {
          name: 'Emisiones',
          type: 'pie',
          radius: ['45%', '70%'], // Donut chart
          center: ['50%', '45%'],
          data: chartData,
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
          label: {
            show: true,
            formatter: () => {
              return `{b}\n{d}%`;
            },
            fontSize: 12,
          },
          labelLine: {
            show: true,
            length: 15,
            length2: 10,
          },
          itemStyle: {
            borderRadius: 4,
            borderWidth: 2,
          },
          // Staggered animation
          animationDelay: (idx: number) => idx * 100,
          animationDuration: 1000,
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
  }, [data, title, loading, height]);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={data}
              csvFormatter={formatCategoryDataForCSV}
              filename={`emisiones_categoria_${title.toLowerCase().replace(/\s+/g, '_')}`}
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
