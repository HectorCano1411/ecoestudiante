'use client';

import { Button } from '@nextui-org/react';
import type { ECharts } from 'echarts';
import { exportChartToPNG, exportToCSV, generateFilename } from '@/lib/export-utils';

interface ExportButtonsProps {
  chartInstance: ECharts | null;
  data: unknown[];
  csvFormatter?: (data: unknown[]) => Record<string, unknown>[];
  filename: string;
  showPNG?: boolean;
  showCSV?: boolean;
  className?: string;
}

/**
 * Export buttons component for charts
 *
 * Features:
 * - PNG export (high quality 2x)
 * - CSV export with custom formatter
 * - NextUI styled buttons
 * - Automatic filename generation with timestamp
 */
export default function ExportButtons({
  chartInstance,
  data,
  csvFormatter,
  filename,
  showPNG = true,
  showCSV = true,
  className = '',
}: ExportButtonsProps) {
  const handlePNGExport = () => {
    if (!chartInstance) {
      console.error('Chart instance not available');
      return;
    }

    const timestampedFilename = generateFilename(`${filename}_grafico`, '');
    exportChartToPNG(chartInstance, timestampedFilename, 2);
  };

  const handleCSVExport = () => {
    if (!data || data.length === 0) {
      console.error('No data available for export');
      return;
    }

    // Format data using provided formatter or use raw data
    const formattedData = csvFormatter ? csvFormatter(data) : (data as Record<string, unknown>[]);

    // Extract headers from first data object
    const headers = formattedData.length > 0 ? Object.keys(formattedData[0] as Record<string, unknown>) : [];

    const timestampedFilename = generateFilename(`${filename}_datos`, '');
    exportToCSV(formattedData, headers, timestampedFilename);
  };

  return (
    <div className={`flex gap-2 ${className}`}>
      {showPNG && (
        <Button
          size="sm"
          color="primary"
          variant="flat"
          onClick={handlePNGExport}
          disabled={!chartInstance}
          className="font-medium !text-black"
        >
          📊 Exportar PNG
        </Button>
      )}

      {showCSV && (
        <Button
          size="sm"
          color="secondary"
          variant="flat"
          onClick={handleCSVExport}
          disabled={!data || data.length === 0}
          className="font-medium !text-black"
        >
          📄 Exportar CSV
        </Button>
      )}
    </div>
  );
}
