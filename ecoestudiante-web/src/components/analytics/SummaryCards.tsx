'use client';

import { Card, CardBody, Skeleton } from '@nextui-org/react';

interface SummaryData {
  totalRecords: number;
  totalKgCO2e: number;
  thisMonthKgCO2e: number;
  averagePerMonth: number;
}

interface SummaryCardsProps {
  summary: SummaryData | null;
  loading?: boolean;
}

/**
 * Summary Cards Component
 *
 * Displays 4 summary statistics cards with icons:
 * - Total Records
 * - Total Carbon Footprint
 * - This Month
 * - Monthly Average
 */
export default function SummaryCards({ summary, loading = false }: SummaryCardsProps) {
  const cards = [
    {
      label: 'Total Registros',
      value: summary?.totalRecords || 0,
      icon: '📊',
      color: 'bg-blue-100',
      textColor: 'text-blue-600',
      format: (val: number) => val.toString(),
    },
    {
      label: 'Huella Total',
      value: summary?.totalKgCO2e || 0,
      icon: '🌱',
      color: 'bg-green-100',
      textColor: 'text-green-600',
      format: (val: number) => `${val.toFixed(2)} kg CO₂e`,
    },
    {
      label: 'Este Mes',
      value: summary?.thisMonthKgCO2e || 0,
      icon: '📅',
      color: 'bg-yellow-100',
      textColor: 'text-yellow-600',
      format: (val: number) => `${val.toFixed(2)} kg CO₂e`,
    },
    {
      label: 'Promedio Mensual',
      value: summary?.averagePerMonth || 0,
      icon: '📈',
      color: 'bg-purple-100',
      textColor: 'text-purple-600',
      format: (val: number) => `${val.toFixed(2)} kg CO₂e`,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, index) => (
        <Card
          key={index}
          className="border-none shadow-sm hover:shadow-md transition-shadow"
          isPressable
        >
          <CardBody className="p-6">
            {loading ? (
              <div className="space-y-3">
                <Skeleton className="h-4 w-3/4 rounded-lg" />
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    {card.label}
                  </p>
                  <p className={`text-2xl font-bold ${card.textColor}`}>
                    {card.format(card.value)}
                  </p>
                </div>
                <div
                  className={`w-12 h-12 ${card.color} dark:opacity-80 rounded-lg flex items-center justify-center flex-shrink-0`}
                >
                  <span className="text-2xl">{card.icon}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
