/**
 * ECharts Theme Configuration for EcoEstudiante
 *
 * Provides consistent theming across all charts with light/dark mode support
 */

// Color palette optimized for environmental data visualization
// Professional, vibrant, and accessible colors
export const CHART_COLORS = [
  '#10b981', // Emerald (primary) - Environment/Growth
  '#3b82f6', // Blue - Trust/Reliability
  '#f59e0b', // Amber - Energy/Warning
  '#ef4444', // Red - Alert/Important
  '#8b5cf6', // Purple - Premium/Quality
  '#ec4899', // Pink - Creativity
  '#06b6d4', // Cyan - Technology/Water
  '#84cc16', // Lime - Fresh/Natural
];

// Category-specific colors (vibrant and distinguishable)
export const CATEGORY_COLORS: Record<string, string> = {
  electricidad: '#f59e0b', // Amber - Energy
  transporte: '#3b82f6',   // Blue - Movement
  residuos: '#10b981',     // Emerald - Recycling/Environment
  agua: '#06b6d4',         // Cyan - Water
  alimentos: '#ec4899',    // Pink - Food
  gas: '#ef4444',          // Red - Gas/Heat
};

// Light theme configuration
export const lightTheme = {
  color: CHART_COLORS,
  backgroundColor: 'transparent',
  textStyle: {
    color: '#374151',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  },
  title: {
    textStyle: {
      color: '#111827',
      fontWeight: 600,
    },
    subtextStyle: {
      color: '#6b7280',
    },
  },
  line: {
    itemStyle: {
      borderWidth: 2,
    },
    lineStyle: {
      width: 3,
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true,
  },
  bar: {
    itemStyle: {
      borderRadius: [8, 8, 0, 0],
      borderWidth: 0,
    },
  },
  pie: {
    itemStyle: {
      borderRadius: 4,
      borderColor: '#fff',
      borderWidth: 2,
    },
  },
  radar: {
    itemStyle: {
      borderWidth: 2,
    },
    lineStyle: {
      width: 2,
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: false,
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      show: true,
      color: '#6b7280',
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: ['#f3f4f6'],
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  valueAxis: {
    axisLine: {
      show: false,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisTick: {
      show: false,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      show: true,
      color: '#6b7280',
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#f3f4f6'],
        type: 'dashed',
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  logAxis: {
    axisLine: {
      show: false,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisTick: {
      show: false,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      show: true,
      color: '#6b7280',
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#f3f4f6'],
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  timeAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#e5e7eb',
      },
    },
    axisLabel: {
      show: true,
      color: '#6b7280',
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: ['#f3f4f6'],
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  toolbox: {
    iconStyle: {
      borderColor: '#6b7280',
    },
    emphasis: {
      iconStyle: {
        borderColor: '#111827',
      },
    },
  },
  legend: {
    textStyle: {
      color: '#374151',
    },
  },
  tooltip: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: '#e5e7eb',
    borderWidth: 1,
    textStyle: {
      color: '#374151',
    },
    axisPointer: {
      lineStyle: {
        color: '#e5e7eb',
        width: 1,
      },
      crossStyle: {
        color: '#e5e7eb',
        width: 1,
      },
    },
  },
  timeline: {
    lineStyle: {
      color: '#6b7280',
      width: 1,
    },
    itemStyle: {
      color: '#6b7280',
      borderWidth: 1,
    },
    controlStyle: {
      color: '#6b7280',
      borderColor: '#6b7280',
      borderWidth: 0.5,
    },
    checkpointStyle: {
      color: '#10b981',
      borderColor: '#059669',
    },
    label: {
      color: '#6b7280',
    },
    emphasis: {
      itemStyle: {
        color: '#374151',
      },
      controlStyle: {
        color: '#374151',
        borderColor: '#374151',
        borderWidth: 0.5,
      },
      label: {
        color: '#374151',
      },
    },
  },
  visualMap: {
    color: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
  },
  dataZoom: {
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    dataBackgroundColor: 'rgba(16, 185, 129, 0.2)',
    fillerColor: 'rgba(16, 185, 129, 0.15)',
    handleColor: '#10b981',
    handleSize: '100%',
    textStyle: {
      color: '#374151',
    },
  },
  markPoint: {
    label: {
      color: '#fff',
    },
    emphasis: {
      label: {
        color: '#fff',
      },
    },
  },
};

// Dark theme configuration
export const darkTheme = {
  color: CHART_COLORS,
  backgroundColor: 'transparent',
  textStyle: {
    color: '#d1d5db',
    fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
  },
  title: {
    textStyle: {
      color: '#f9fafb',
      fontWeight: 600,
    },
    subtextStyle: {
      color: '#9ca3af',
    },
  },
  line: {
    itemStyle: {
      borderWidth: 2,
    },
    lineStyle: {
      width: 3,
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: true,
  },
  bar: {
    itemStyle: {
      borderRadius: [8, 8, 0, 0],
      borderWidth: 0,
    },
  },
  pie: {
    itemStyle: {
      borderRadius: 4,
      borderColor: '#1f2937',
      borderWidth: 2,
    },
  },
  radar: {
    itemStyle: {
      borderWidth: 2,
    },
    lineStyle: {
      width: 2,
    },
    symbolSize: 6,
    symbol: 'circle',
    smooth: false,
  },
  categoryAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#374151',
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#374151',
      },
    },
    axisLabel: {
      show: true,
      color: '#9ca3af',
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: ['#374151'],
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  valueAxis: {
    axisLine: {
      show: false,
      lineStyle: {
        color: '#374151',
      },
    },
    axisTick: {
      show: false,
      lineStyle: {
        color: '#374151',
      },
    },
    axisLabel: {
      show: true,
      color: '#9ca3af',
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#374151'],
        type: 'dashed',
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  logAxis: {
    axisLine: {
      show: false,
      lineStyle: {
        color: '#374151',
      },
    },
    axisTick: {
      show: false,
      lineStyle: {
        color: '#374151',
      },
    },
    axisLabel: {
      show: true,
      color: '#9ca3af',
    },
    splitLine: {
      show: true,
      lineStyle: {
        color: ['#374151'],
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  timeAxis: {
    axisLine: {
      show: true,
      lineStyle: {
        color: '#374151',
      },
    },
    axisTick: {
      show: true,
      lineStyle: {
        color: '#374151',
      },
    },
    axisLabel: {
      show: true,
      color: '#9ca3af',
    },
    splitLine: {
      show: false,
      lineStyle: {
        color: ['#374151'],
      },
    },
    splitArea: {
      show: false,
      areaStyle: {
        color: ['rgba(250,250,250,0.05)', 'rgba(200,200,200,0.02)'],
      },
    },
  },
  toolbox: {
    iconStyle: {
      borderColor: '#9ca3af',
    },
    emphasis: {
      iconStyle: {
        borderColor: '#f9fafb',
      },
    },
  },
  legend: {
    textStyle: {
      color: '#d1d5db',
    },
  },
  tooltip: {
    backgroundColor: 'rgba(31, 41, 55, 0.95)',
    borderColor: '#4b5563',
    borderWidth: 1,
    textStyle: {
      color: '#d1d5db',
    },
    axisPointer: {
      lineStyle: {
        color: '#4b5563',
        width: 1,
      },
      crossStyle: {
        color: '#4b5563',
        width: 1,
      },
    },
  },
  timeline: {
    lineStyle: {
      color: '#9ca3af',
      width: 1,
    },
    itemStyle: {
      color: '#9ca3af',
      borderWidth: 1,
    },
    controlStyle: {
      color: '#9ca3af',
      borderColor: '#9ca3af',
      borderWidth: 0.5,
    },
    checkpointStyle: {
      color: '#10b981',
      borderColor: '#059669',
    },
    label: {
      color: '#9ca3af',
    },
    emphasis: {
      itemStyle: {
        color: '#d1d5db',
      },
      controlStyle: {
        color: '#d1d5db',
        borderColor: '#d1d5db',
        borderWidth: 0.5,
      },
      label: {
        color: '#d1d5db',
      },
    },
  },
  visualMap: {
    color: ['#10b981', '#34d399', '#6ee7b7', '#a7f3d0', '#d1fae5'],
  },
  dataZoom: {
    backgroundColor: 'rgba(31, 41, 55, 0.8)',
    dataBackgroundColor: 'rgba(16, 185, 129, 0.2)',
    fillerColor: 'rgba(16, 185, 129, 0.15)',
    handleColor: '#10b981',
    handleSize: '100%',
    textStyle: {
      color: '#d1d5db',
    },
  },
  markPoint: {
    label: {
      color: '#fff',
    },
    emphasis: {
      label: {
        color: '#fff',
      },
    },
  },
};

// Export configuration for charts
export const exportConfig = {
  pixelRatio: 2, // High-quality export
  backgroundColor: '#ffffff',
};

// Data zoom configuration for temporal charts
export const dataZoomConfig = [
  {
    type: 'inside',
    start: 0,
    end: 100,
    zoomOnMouseWheel: true,
    moveOnMouseMove: true,
    moveOnMouseWheel: false,
  },
  {
    type: 'slider',
    start: 0,
    end: 100,
    height: 30,
    bottom: 10,
    borderColor: 'transparent',
    backgroundColor: 'rgba(16, 185, 129, 0.05)',
    fillerColor: 'rgba(16, 185, 129, 0.15)',
    handleSize: '80%',
    showDetail: false,
  },
];

// Grid configuration for better spacing
export const gridConfig = {
  left: '3%',
  right: '4%',
  bottom: '10%',
  top: '15%',
  containLabel: true,
};

// Tooltip configuration
export const tooltipConfig = {
  trigger: 'axis',
  confine: true,
  borderWidth: 1,
  padding: [8, 12],
  textStyle: {
    fontSize: 12,
  },
};

// Legend configuration
export const legendConfig = {
  bottom: 0,
  left: 'center',
  type: 'scroll',
  pageButtonItemGap: 5,
  pageIconSize: 12,
  pageTextStyle: {
    fontSize: 12,
  },
};

// Helper function to get theme based on mode
export const getTheme = (isDark: boolean) => {
  return isDark ? darkTheme : lightTheme;
};

// Helper function to get category color
export const getCategoryColor = (category: string): string => {
  return CATEGORY_COLORS[category.toLowerCase()] || CHART_COLORS[0];
};
