'use client';

import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import ExportButtons from './ExportButtons';
import { formatCategoryDataForCSV } from '@/lib/export-utils';
import { getCategoryColor } from '@/config/echarts-theme';

interface CategoryDataPoint {
  name: string;
  value: number;
  records?: number;
}

interface CategoryBarChartProps {
  data: CategoryDataPoint[];
  title?: string;
  loading?: boolean;
  height?: number | string;
  showExport?: boolean;
  mode?: 'emissions' | 'records';
  className?: string;
}

export default function CategoryBarChart({
  data,
  title = 'Emisiones por Categoría',
  loading = false,
  height = 400,
  showExport = true,
  mode = 'emissions',
  className = '',
}: CategoryBarChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const [chartInstance, setChartInstance] = useState<ECharts | null>(null);

  useEffect(() => {
    if (!chartRef.current || loading) return;

    // Initialize chart
    const myChart = echarts.init(chartRef.current);
    setChartInstance(myChart);

    // Prepare data
    const categories = data.map((item) => item.name);
    const seriesData = data.map((item) => {
      const categoryKey = item.name.toLowerCase();
      const color = getCategoryColor(categoryKey);

      return {
        value: mode === 'emissions' ? item.value : item.records || 0,
        itemStyle: {
          color: {
            type: 'linear' as const,
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: color },
              { offset: 1, color: `${color}CC` },
            ],
          },
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
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'shadow',
        },
        confine: true,
        borderWidth: 1,
        padding: [8, 12],
        textStyle: {
          fontSize: 12,
        },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        formatter: (params: any) => {
          const dataIndex = params[0].dataIndex;
          const category = categories[dataIndex];
          const records = data[dataIndex].records || 0;
          const emission = data[dataIndex].value;
          const color = getCategoryColor(category.toLowerCase());

          if (mode === 'emissions') {
            return `
              <div style="padding: 4px 0;">
                <div style="font-weight: 600; margin-bottom: 8px;">${category}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
                  <span>Emisiones: <strong>${emission.toFixed(2)} kg CO₂e</strong></span>
                </div>
                <div style="color: #6b7280; font-size: 12px;">
                  📝 ${records} registro${records !== 1 ? 's' : ''}
                </div>
              </div>
            `;
          } else {
            return `
              <div style="padding: 4px 0;">
                <div style="font-weight: 600; margin-bottom: 8px;">${category}</div>
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <span style="display: inline-block; width: 10px; height: 10px; background: ${color}; border-radius: 50%;"></span>
                  <span>Registros: <strong>${records}</strong></span>
                </div>
                <div style="color: #6b7280; font-size: 12px;">
                  💨 ${emission.toFixed(2)} kg CO₂e
                </div>
              </div>
            `;
          }
        },
      },
      xAxis: {
        type: 'category',
        data: categories,
        axisLabel: {
          interval: 0,
          rotate: categories.length > 5 ? 45 : 0,
          fontSize: 12,
        },
      },
      yAxis: {
        type: 'value',
        name: mode === 'emissions' ? 'kg CO₂e' : 'Registros',
        nameTextStyle: {
          padding: [0, 0, 0, 10],
        },
        axisLabel: {
          formatter: (value: number) => {
            if (mode === 'emissions' && value >= 1000) {
              return `${(value / 1000).toFixed(1)}k`;
            }
            return value.toFixed(0);
          },
        },
      },
      series: [
        {
          name: mode === 'emissions' ? 'Emisiones' : 'Registros',
          type: 'bar',
          data: seriesData,
          barWidth: '60%',
          itemStyle: {
            borderRadius: [8, 8, 0, 0],
          },
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowOffsetY: 2,
              shadowColor: 'rgba(0, 0, 0, 0.3)',
            },
          },
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
  }, [data, title, loading, mode, height]);

  return (
    <div className={className}>
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        {showExport && (
          <div className="flex justify-end mb-2">
            <ExportButtons
              chartInstance={chartInstance}
              data={data}
              csvFormatter={formatCategoryDataForCSV}
              filename={`${mode}_categoria_${title.toLowerCase().replace(/\s+/g, '_')}`}
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
