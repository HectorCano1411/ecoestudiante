/**
 * Export utilities for charts
 *
 * Provides functions to export charts as PNG images and data as CSV files
 */

import type { ECharts } from 'echarts';

/**
 * Export chart to PNG image
 *
 * @param chartInstance - ECharts instance
 * @param filename - Name for the downloaded file (without extension)
 * @param pixelRatio - Pixel ratio for high-quality export (default: 2)
 */
export function exportChartToPNG(
  chartInstance: ECharts,
  filename: string = 'chart',
  pixelRatio: number = 2
): void {
  if (!chartInstance) {
    console.error('Chart instance is not available');
    return;
  }

  try {
    // Get image data URL
    const imageDataURL = chartInstance.getDataURL({
      type: 'png',
      pixelRatio,
      backgroundColor: '#ffffff',
    });

    // Create download link
    const link = document.createElement('a');
    link.href = imageDataURL;
    link.download = `${filename}.png`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error exporting chart to PNG:', error);
  }
}

/**
 * Export data to CSV file
 *
 * @param data - Array of data objects
 * @param headers - Array of header names
 * @param filename - Name for the downloaded file (without extension)
 */
export function exportToCSV(
  data: Record<string, unknown>[],
  headers: string[],
  filename: string = 'data'
): void {
  if (!data || data.length === 0) {
    console.error('No data to export');
    return;
  }

  try {
    // Create CSV header row
    const csvHeader = headers.join(',');

    // Create CSV data rows
    const csvRows = data.map((row) => {
      return headers
        .map((header) => {
          const value = row[header];
          // Handle values with commas or quotes
          if (value === null || value === undefined) {
            return '';
          }
          const stringValue = String(value);
          if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        })
        .join(',');
    });

    // Combine header and rows
    const csvContent = [csvHeader, ...csvRows].join('\n');

    // Create Blob
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}.csv`;

    // Trigger download
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to CSV:', error);
  }
}

/**
 * Format time series data for CSV export
 *
 * @param data - Array of time series data points
 * @param valueKey - Key for the value field (default: 'emissions')
 * @param dateKey - Key for the date field (default: 'period')
 * @returns Formatted data array
 */
export function formatTimeSeriesForCSV(
  data: unknown[],
  valueKey: string = 'emissions',
  dateKey: string = 'period'
): Record<string, unknown>[] {
  return data.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      Fecha: record[dateKey] || record.date || record.name || '',
      'Emisiones (kg CO₂e)': Number(record[valueKey] || record.value || 0).toFixed(2),
      Registros: record.records || record.count || 0,
    };
  });
}

/**
 * Format category data for CSV export
 *
 * @param data - Array of category data points
 * @param nameKey - Key for the category name field (default: 'name')
 * @param valueKey - Key for the value field (default: 'value')
 * @returns Formatted data array
 */
export function formatCategoryDataForCSV(
  data: unknown[],
  nameKey: string = 'name',
  valueKey: string = 'value'
): Record<string, unknown>[] {
  return data.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      Categoría: record[nameKey] || '',
      'Emisiones (kg CO₂e)': Number(record[valueKey] || 0).toFixed(2),
      Porcentaje: record.percentage
        ? `${Number(record.percentage).toFixed(2)}%`
        : record.value && record.total
        ? `${((Number(record.value) / Number(record.total)) * 100).toFixed(2)}%`
        : '',
      Registros: record.records || record.count || 0,
    };
  });
}

/**
 * Format stacked area data for CSV export
 *
 * @param data - Array of stacked area data points
 * @param categories - Array of category names
 * @returns Formatted data array
 */
export function formatStackedDataForCSV(data: unknown[], categories: string[]): Record<string, unknown>[] {
  return data.map((item) => {
    const record = item as Record<string, unknown>;
    const row: Record<string, unknown> = {
      Fecha: record.date || record.period || record.name || '',
    };

    // Add each category as a column
    categories.forEach((category) => {
      row[category] = Number(record[category] || 0).toFixed(2);
    });

    // Add total if available
    if (record.total !== undefined) {
      row['Total'] = Number(record.total).toFixed(2);
    }

    return row;
  });
}

/**
 * Format radar chart data for CSV export
 *
 * @param data - Array of radar data points
 * @returns Formatted data array
 */
export function formatRadarDataForCSV(data: unknown[]): Record<string, unknown>[] {
  return data.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      Categoría: record.name || record.category || '',
      Valor: Number(record.value || 0).toFixed(2),
      'Valor Máximo': Number(record.max || 0).toFixed(2),
      Porcentaje: record.max
        ? `${((Number(record.value) / Number(record.max)) * 100).toFixed(2)}%`
        : '',
    };
  });
}

/**
 * Format heatmap data for CSV export
 *
 * @param data - Array of heatmap data points
 * @returns Formatted data array
 */
export function formatHeatmapDataForCSV(data: unknown[]): Record<string, unknown>[] {
  return data.map((item) => {
    const record = item as Record<string, unknown>;
    return {
      Fecha: record.date || `${record.year}-${String(record.month).padStart(2, '0')}-${String(record.day).padStart(2, '0')}`,
      'Emisiones (kg CO₂e)': Number(record.value || 0).toFixed(2),
    };
  });
}

/**
 * Download data as JSON file
 *
 * @param data - Data object to export
 * @param filename - Name for the downloaded file (without extension)
 */
export function exportToJSON(data: unknown, filename: string = 'data'): void {
  try {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });

    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    link.download = `${filename}.json`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting to JSON:', error);
  }
}

/**
 * Generate filename with timestamp
 *
 * @param baseName - Base name for the file
 * @param extension - File extension (default: '')
 * @returns Filename with timestamp
 */
export function generateFilename(baseName: string, extension: string = ''): string {
  const timestamp = new Date()
    .toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '');

  const ext = extension ? `.${extension}` : '';
  return `${baseName}_${timestamp}${ext}`;
}
