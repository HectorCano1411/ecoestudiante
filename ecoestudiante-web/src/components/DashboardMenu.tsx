'use client';

export type MenuItem = {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  available: boolean;
};

interface DashboardMenuProps {
  onItemClick?: (itemId: string) => void;
}

export default function DashboardMenu({ onItemClick }: DashboardMenuProps) {
  const menuItems: MenuItem[] = [
    {
      id: 'electricity',
      title: 'Electricidad',
      description: 'Registra tu consumo eléctrico mensual',
      icon: '⚡',
      color: 'bg-yellow-500',
      available: true,
    },
    {
      id: 'transport',
      title: 'Transporte',
      description: 'Registra tus viajes en vehículos',
      icon: '🚗',
      color: 'bg-blue-500',
      available: true,
    },
    {
      id: 'food',
      title: 'Alimentación',
      description: 'Registra tu consumo de alimentos',
      icon: '🍽️',
      color: 'bg-green-500',
      available: false,
    },
    {
      id: 'water',
      title: 'Agua',
      description: 'Registra tu consumo de agua',
      icon: '💧',
      color: 'bg-cyan-500',
      available: false,
    },
    {
      id: 'waste',
      title: 'Residuos',
      description: 'Registra tu generación de residuos',
      icon: '🗑️',
      color: 'bg-purple-600',
      available: true,
    },
    {
      id: 'other',
      title: 'Otros',
      description: 'Otras actividades que generan emisiones',
      icon: '📊',
      color: 'bg-purple-500',
      available: false,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {menuItems.map((item) => (
        <div
          key={item.id}
          onClick={() => item.available && onItemClick?.(item.id)}
          className={`
            relative p-6 rounded-xl border-2 transition-all duration-200
            ${item.available 
              ? 'border-gray-200 hover:border-green-300 hover:shadow-lg cursor-pointer bg-white' 
              : 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed'
            }
          `}
        >
          <div className="flex items-start gap-4">
            <div className={`
              ${item.color} text-white text-2xl w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0
            `}>
              {item.icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-800 mb-1">
                {item.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {item.description}
              </p>
              {!item.available && (
                <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                  Próximamente
                </span>
              )}
              {item.available && (
                <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                  Disponible
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

