'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import type { ElectricityInput, CalcResult } from '@/types/calc';

export default function ElectricityForm() {
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<CalcResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onCalc() {
    setLoading(true); setError(null); setOut(null);
    try {
      const userId = crypto.randomUUID();
      const payload: ElectricityInput = {
        kwh: 10, country: 'CL', period: '2025-09',
        idempotencyKey: 'web-demo', userId
      };
      const res = await api<CalcResult>('/calc/electricity', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setOut(res);
    } catch (e: any) {
      setError(e?.message ?? 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        className="rounded-lg border px-4 py-2 hover:bg-zinc-800"
        onClick={onCalc}
        disabled={loading}
      >
        {loading ? 'Calculando…' : 'Calcular 10 kWh (CL, 2025-09)'}
      </button>

      {out && (
        <pre className="text-sm text-green-400">{JSON.stringify(out, null, 2)}</pre>
      )}
      {error && <p className="text-red-400">{error}</p>}
    </div>
  );
}
