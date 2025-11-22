// Tipos para cálculos de transporte y movilidad

export interface TransportInput {
  distance: number; // km
  transportMode: 'car' | 'bus' | 'metro' | 'bicycle' | 'walking' | 'plane' | 'motorcycle';
  fuelType?: 'gasoline' | 'diesel' | 'electric' | 'hybrid'; // Solo para car/motorcycle
  occupancy?: number; // Número de pasajeros (para car/bus)
  country: string; // ISO-3166-1 alpha-2
  period: string; // YYYY-MM
  idempotencyKey: string;
  userId: string;
  originLat?: number;
  originLng?: number;
  destinationLat?: number;
  destinationLng?: number;
  originAddress?: string;
  destinationAddress?: string;
}

export interface ElectricityInput {
  kwh: number;
  country: string;
  period: string;
  idempotencyKey: string;
  userId: string;
  selectedAppliances?: string[];
  career?: string;
  schedule?: 'diurna' | 'vespertina';
}

export interface CalcResult {
  calcId: string;
  kgCO2e: number;
  factorHash: string;
}

export type StatsSummary = {
  totalKgCO2e: number;
  totalRecords: number;
  thisMonthKgCO2e: number;
  lastMonthKgCO2e: number;
  averagePerMonth: number;
  calculatedAt: string;
};

// Tipos para el historial
export interface FactorInfo {
  value: number | null;
  unit: string | null;
  subcategory: string | null;
}

export interface CalcHistoryItem {
  calcId: string;
  category: string;
  subcategory: string;
  input: {
    // Transporte
    distance?: number;
    transportMode?: string;
    fuelType?: string;
    occupancy?: number;
    country?: string;
    period?: string;
    originLat?: number;
    originLng?: number;
    destinationLat?: number;
    destinationLng?: number;
    originAddress?: string;
    destinationAddress?: string;
    // Electricidad
    kwh?: number;
    selectedAppliances?: string[];
    career?: string;
    schedule?: string;
    // Otros campos comunes
    [key: string]: unknown;
  };
  kgCO2e: number;
  factorInfo: FactorInfo | null;
  createdAt: string;
}

export interface CalcHistoryResponse {
  items: CalcHistoryItem[];
  total: number;
  page: number;
  pageSize: number;
}
