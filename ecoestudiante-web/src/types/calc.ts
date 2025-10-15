export type ElectricityInput = {
  kwh: number;
  country: string;   // ISO-2
  period: string;    // YYYY-MM
  idempotencyKey?: string;
  userId: string;    // UUID
};

export type CalcResult = {
  calcId: string;
  kgCO2e: number;
  factorHash: string;
};
