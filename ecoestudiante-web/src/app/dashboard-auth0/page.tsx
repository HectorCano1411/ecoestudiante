/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useUser } from '@auth0/nextjs-auth0/client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function DashboardPage() {
  const { user, error, isLoading } = useUser();
  const router = useRouter();
  const [calculationResult, setCalculationResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/api/auth/login');
    }
  }, [isLoading, user, router]);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/proxy/calculo?path=calc/electricity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          kwh: 100,
          country: 'CL',
          period: '2025-01',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setCalculationResult(data);
      } else {
        console.error('Error en cálculo:', await response.text());
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">Error: {error.message}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>
          
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Información del Usuario</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="space-y-2">
                <p><span className="font-medium">Sub:</span> {user.sub}</p>
                <p><span className="font-medium">Email:</span> {user.email}</p>
                <p><span className="font-medium">Nombre:</span> {user.name || 'N/A'}</p>
                {user.picture && (
                  <div className="mt-4">
                    <Image src={user.picture} alt="Profile" width={80} height={80} className="rounded-full" />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Claims del Token</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-xs overflow-auto">
                {JSON.stringify(user, null, 2)}
              </pre>
            </div>
          </div>

          <div className="mb-6">
            <button
              onClick={handleCalculate}
              disabled={loading}
              className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold hover:from-green-700 hover:to-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Calculando...' : 'Calcular CO₂e Demo'}
            </button>
          </div>

          {calculationResult && (
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-700 mb-4">Resultado del Cálculo</h2>
              <div className="bg-green-50 rounded-lg p-4">
                <pre className="text-sm overflow-auto">
                  {JSON.stringify(calculationResult, null, 2)}
                </pre>
              </div>
            </div>
          )}

          <div className="mt-6">
            <Link
              href="/api/auth/logout"
              className="inline-block px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
            >
              Cerrar Sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

