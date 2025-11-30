'use client';

import { useState } from 'react';
import {
  Accordion,
  AccordionItem,
  Button,
  Checkbox,
  Chip,
  Input,
} from '@nextui-org/react';

interface CategoryStats {
  recordCount: number;
  totalKgCO2e: number;
}

interface CategoryData {
  categories: Array<{
    category: string;
    recordCount: number;
    totalKgCO2e: number;
  }>;
  totalKgCO2e: number;
}

interface CategorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  availableCategories: Record<string, string[]>;
  selectedCategories: Set<string>;
  expandedCategories: Set<string>;
  categoryData: CategoryData | null;
  summary: {
    totalRecords: number;
    totalKgCO2e: number;
  } | null;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onReload: () => void;
  onToggleCategory: (category: string) => void;
  onToggleExpansion: (category: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  getCategoryIcon: (category: string) => string;
  getCategoryLabel: (category: string) => string;
  getCategoryStats: (category: string) => CategoryStats;
  getSubcategoryLabel: (category: string, subcategory: string) => string;
}

/**
 * Category Sidebar Component
 *
 * Filterable sidebar for selecting emission categories and subcategories
 */
export default function CategorySidebar({
  isOpen,
  onClose,
  availableCategories,
  selectedCategories,
  expandedCategories,
  categoryData,
  summary,
  onSelectAll,
  onDeselectAll,
  onReload,
  onToggleCategory,
  onToggleExpansion,
  onExpandAll,
  onCollapseAll,
  getCategoryIcon,
  getCategoryLabel,
  getCategoryStats,
  getSubcategoryLabel,
}: CategorySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const totalRecords = categoryData
    ? categoryData.categories.reduce((sum, cat) => sum + cat.recordCount, 0)
    : summary?.totalRecords || 0;

  const totalKgCO2e = categoryData
    ? categoryData.totalKgCO2e
    : summary?.totalKgCO2e || 0;

  // Filter categories based on search
  const filteredCategories = Object.entries(availableCategories).filter(
    ([category, subcategories]) => {
      const categoryLabel = getCategoryLabel(category).toLowerCase();
      const term = searchTerm.toLowerCase();
      if (categoryLabel.includes(term)) return true;

      // Check subcategories
      return Array.isArray(subcategories) &&
        subcategories.some((sub) =>
          getSubcategoryLabel(category, sub).toLowerCase().includes(term)
        );
    }
  );

  if (!isOpen) return null;

  return (
    <aside className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 shadow-lg flex-shrink-0 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span>🌱</span> Filtros de Emisiones
          </h3>
          <Button
            isIconOnly
            size="sm"
            variant="light"
            onPress={onClose}
            className="min-w-unit-8"
          >
            <span className="text-xl">←</span>
          </Button>
        </div>

        {/* Search */}
        <Input
          size="sm"
          placeholder="Buscar categorías..."
          value={searchTerm}
          onValueChange={setSearchTerm}
          isClearable
          className="mb-3"
          classNames={{
            input: 'text-sm',
          }}
        />

        {/* Action buttons */}
        <div className="flex gap-2 mb-2">
          <Button
            size="sm"
            color="success"
            onPress={onSelectAll}
            className="flex-1 font-medium"
          >
            ✓ Todas
          </Button>
          <Button
            size="sm"
            color="default"
            variant="flat"
            onPress={onDeselectAll}
            className="flex-1 font-medium"
          >
            ✗ Ninguna
          </Button>
        </div>

        <Button
          size="sm"
          color="primary"
          variant="flat"
          onPress={onReload}
          className="w-full font-medium"
        >
          🔄 Recargar Categorías
        </Button>

        {/* Summary */}
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div className="flex justify-between">
              <span>Total Registros:</span>
              <span className="font-semibold text-gray-800 dark:text-gray-200">
                {totalRecords}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Huella Total:</span>
              <span className="font-semibold text-green-600">
                {totalKgCO2e.toFixed(2)} kg CO₂e
              </span>
            </div>
          </div>
          {selectedCategories.size > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500">
                {selectedCategories.size} elemento
                {selectedCategories.size !== 1 ? 's' : ''} seleccionado
                {selectedCategories.size !== 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Categories List */}
      <div className="flex-1 overflow-y-auto p-4">
        {Object.keys(availableCategories).length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
            <p className="text-sm">Cargando categorías...</p>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <p className="text-sm">No se encontraron categorías</p>
          </div>
        ) : (
          <Accordion
            variant="splitted"
            selectedKeys={Array.from(expandedCategories)}
          >
            {filteredCategories.map(([category, subcategories]) => {
              const validSubcategories = Array.isArray(subcategories)
                ? subcategories
                : [];
              const hasSubcategories = validSubcategories.length > 0;
              const stats = getCategoryStats(category);

              return (
                <AccordionItem
                  key={category}
                  aria-label={getCategoryLabel(category)}
                  title={
                    <div className="flex items-center gap-2 w-full">
                      <Checkbox
                        isSelected={selectedCategories.has(category)}
                        onValueChange={() => onToggleCategory(category)}
                        onClick={(e) => e.stopPropagation()}
                        size="sm"
                      />
                      <span className="text-lg">{getCategoryIcon(category)}</span>
                      <span className="font-semibold flex-1">
                        {getCategoryLabel(category)}
                      </span>
                      {hasSubcategories && (
                        <Chip size="sm" variant="flat">
                          {validSubcategories.length}
                        </Chip>
                      )}
                    </div>
                  }
                  subtitle={
                    stats.recordCount > 0 ? (
                      <div className="flex items-center gap-2 ml-6 mt-1">
                        <Chip size="sm" color="primary" variant="flat">
                          {stats.recordCount} registro
                          {stats.recordCount !== 1 ? 's' : ''}
                        </Chip>
                        <Chip size="sm" color="success" variant="flat">
                          {stats.totalKgCO2e.toFixed(2)} kg CO₂e
                        </Chip>
                      </div>
                    ) : null
                  }
                  onPress={() => hasSubcategories && onToggleExpansion(category)}
                >
                  {hasSubcategories && (
                    <div className="space-y-1 pl-2">
                      {validSubcategories.map((subcat) => {
                        if (!subcat) return null;
                        const fullKey = `${category}_${subcat}`;
                        const isSelected = selectedCategories.has(fullKey);

                        return (
                          <div
                            key={fullKey}
                            className={`flex items-center gap-2 p-2.5 rounded-lg transition-all ${
                              isSelected
                                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <Checkbox
                              isSelected={isSelected}
                              onValueChange={() => onToggleCategory(fullKey)}
                              size="sm"
                            />
                            <span className="text-sm flex-1">
                              {getSubcategoryLabel(category, subcat)}
                            </span>
                            {isSelected && (
                              <span className="text-green-500 text-sm font-bold">
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-gradient-to-r from-green-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {selectedCategories.size}
            </span>
            <span className="text-xs text-gray-600 dark:text-gray-400">
              elemento{selectedCategories.size !== 1 ? 's' : ''} seleccionado
              {selectedCategories.size !== 1 ? 's' : ''}
            </span>
          </div>
          {selectedCategories.size > 0 && (
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={onExpandAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Expandir todas
              </button>
              <span className="text-gray-300 mx-2">|</span>
              <button
                onClick={onCollapseAll}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Colapsar todas
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
