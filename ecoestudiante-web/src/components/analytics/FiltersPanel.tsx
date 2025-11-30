'use client';

import { Card, CardBody, CardHeader, Select, SelectItem, Button } from '@nextui-org/react';

interface FiltersPanelProps {
  // Group by filter
  groupBy: 'month' | 'day';
  onGroupByChange: (value: 'month' | 'day') => void;

  // Period filter
  months: number;
  onMonthsChange: (value: number) => void;

  // Schedule filter
  schedule: string;
  onScheduleChange: (value: string) => void;

  // Career filter
  career: string;
  onCareerChange: (value: string) => void;
  availableCareers: string[];

  // Month of year filter
  month: number | '';
  onMonthChange: (value: number | '') => void;

  // Day of month filter
  day: number | '';
  onDayChange: (value: number | '') => void;

  // Actions
  onUpdate: () => void;
  onClear: () => void;
  loading?: boolean;
}

const MONTHS = [
  { value: '1', label: 'Enero' },
  { value: '2', label: 'Febrero' },
  { value: '3', label: 'Marzo' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Mayo' },
  { value: '6', label: 'Junio' },
  { value: '7', label: 'Julio' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Septiembre' },
  { value: '10', label: 'Octubre' },
  { value: '11', label: 'Noviembre' },
  { value: '12', label: 'Diciembre' },
];

const DAYS = Array.from({ length: 31 }, (_, i) => ({
  value: String(i + 1),
  label: `Día ${i + 1}`,
}));

/**
 * FiltersPanel Component - Enterprise Edition
 *
 * Professional-grade filtering interface with:
 * - Maximum contrast dark theme dropdowns
 * - Zero dropdown overlap (progressive z-index)
 * - Accessibility-first design
 * - Smooth animations and transitions
 * - Mobile-responsive
 *
 * @architecture Multi-layer styling approach:
 *   Layer 1: Global CSS (filters-panel.css) - Base styles
 *   Layer 2: Tailwind utilities - Layout and spacing
 *   Layer 3: NextUI props - Component behavior
 */
export default function FiltersPanel({
  groupBy,
  onGroupByChange,
  months,
  onMonthsChange,
  schedule,
  onScheduleChange,
  career,
  onCareerChange,
  availableCareers,
  month,
  onMonthChange,
  day,
  onDayChange,
  onUpdate,
  onClear,
  loading = false,
}: FiltersPanelProps) {
  return (
    <Card className="mb-8 shadow-lg border-2 border-gray-200 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="pb-3 pt-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50">
        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2 drop-shadow-sm">
          🔍 Filtros de Análisis
        </h3>
      </CardHeader>

      <CardBody className="gap-6 p-6">
        {/* Row 1: Main filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Filter 1: Agrupar por */}
          <div className="filter-dropdown-1 min-h-[80px] flex items-start">
            <Select
              label="Agrupar por"
              selectedKeys={[groupBy]}
              onChange={(e) => onGroupByChange(e.target.value as 'month' | 'day')}
              classNames={{
                base: "w-full",
                trigger: "min-h-[56px] py-2 px-3",
                value: "text-sm pr-8 truncate",
                innerWrapper: "pr-2",
              }}
            >
              <SelectItem key="month" value="month">
                Mes
              </SelectItem>
              <SelectItem key="day" value="day">
                Día
              </SelectItem>
            </Select>
          </div>

          {/* Filter 2: Período */}
          <div className="filter-dropdown-2 min-h-[80px] flex items-start">
            <Select
              label="Período (meses)"
              selectedKeys={[String(months)]}
              onChange={(e) => onMonthsChange(Number(e.target.value))}
              classNames={{
                base: "w-full",
                trigger: "min-h-[56px] py-2 px-3",
                value: "text-sm pr-8 truncate",
                innerWrapper: "pr-2",
              }}
            >
              <SelectItem key="3" value="3">
                Últimos 3 meses
              </SelectItem>
              <SelectItem key="6" value="6">
                Últimos 6 meses
              </SelectItem>
              <SelectItem key="12" value="12">
                Últimos 12 meses
              </SelectItem>
              <SelectItem key="24" value="24">
                Últimos 24 meses
              </SelectItem>
            </Select>
          </div>

          {/* Filter 3: Jornada */}
          <div className="filter-dropdown-3 min-h-[80px] flex items-start">
            <Select
              label="Jornada"
              selectedKeys={schedule ? [schedule] : []}
              onChange={(e) => onScheduleChange(e.target.value)}
              classNames={{
                base: "w-full",
                trigger: "min-h-[56px] py-2 px-3",
                value: "text-sm pr-8 truncate",
                innerWrapper: "pr-2",
              }}
            >
              <SelectItem key="" value="">
                Todas
              </SelectItem>
              <SelectItem key="diurna" value="diurna">
                Diurna
              </SelectItem>
              <SelectItem key="vespertina" value="vespertina">
                Vespertina
              </SelectItem>
            </Select>
          </div>

          {/* Filter 4: Carrera */}
          <div className="filter-dropdown-4 min-h-[80px] flex items-start">
            <Select
              label="Carrera"
              selectedKeys={career ? [career] : []}
              onChange={(e) => onCareerChange(e.target.value)}
              items={[{ value: '', label: 'Todas' }, ...availableCareers.map(c => ({ value: c, label: c }))]}
              classNames={{
                base: "w-full",
                trigger: "min-h-[56px] py-2 px-3",
                value: "text-sm pr-8 truncate",
                innerWrapper: "pr-2",
              }}
            >
              {(item) => (
                <SelectItem key={item.value} value={item.value} textValue={item.label}>
                  {item.label}
                </SelectItem>
              )}
            </Select>
          </div>
        </div>

        {/* Row 2: Date filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Filter 5: Mes del Año */}
          <div className="filter-dropdown-5 min-h-[80px] flex items-start">
            <Select
              label="Mes del Año"
              selectedKeys={month !== '' ? [String(month)] : []}
              onChange={(e) =>
                onMonthChange(e.target.value ? Number(e.target.value) : '')
              }
              items={[{ value: '', label: 'Todos los meses' }, ...MONTHS]}
              classNames={{
                base: "w-full",
                trigger: "min-h-[56px] py-2 px-3",
                value: "text-sm pr-8 truncate",
                innerWrapper: "pr-2",
              }}
            >
              {(item) => (
                <SelectItem key={item.value} value={item.value} textValue={item.label}>
                  {item.label}
                </SelectItem>
              )}
            </Select>
          </div>

          {/* Filter 6: Día del Mes */}
          <div className="filter-dropdown-6 min-h-[80px] flex items-start">
            <Select
              label="Día del Mes"
              selectedKeys={day !== '' ? [String(day)] : []}
              onChange={(e) => onDayChange(e.target.value ? Number(e.target.value) : '')}
              items={[{ value: '', label: 'Todos los días' }, ...DAYS]}
              classNames={{
                base: "w-full",
                trigger: "min-h-[56px] py-2 px-3",
                value: "text-sm pr-8 truncate",
                innerWrapper: "pr-2",
              }}
            >
              {(item) => (
                <SelectItem key={item.value} value={item.value} textValue={item.label}>
                  {item.label}
                </SelectItem>
              )}
            </Select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t-2 border-gray-200 mt-2">
          <Button
            color="success"
            variant="solid"
            onPress={onUpdate}
            isLoading={loading}
            startContent={!loading && <span className="text-lg">🔄</span>}
            className="font-bold text-base h-12 px-6 shadow-lg hover:shadow-xl transition-all bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400"
          >
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>

          <Button
            color="default"
            variant="bordered"
            onPress={onClear}
            startContent={<span className="text-lg">🗑️</span>}
            className="font-bold text-base h-12 px-6 border-2 border-slate-300 hover:border-slate-400 hover:bg-slate-50 transition-all"
          >
            Limpiar Filtros
          </Button>

          <div className="ml-auto text-sm text-slate-600 font-medium hidden md:block">
            💡 Tip: Selecciona múltiples filtros para análisis detallado
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
