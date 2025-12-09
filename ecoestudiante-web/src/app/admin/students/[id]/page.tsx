'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import Link from 'next/link';

interface StudentDetail {
  id: string;
  username: string;
  email: string;
  carrera: string;
  jornada: string;
  emailVerified: boolean;
  enabled: boolean;
  authProvider: string;
  createdAt: string;
  lastActivity: string | null;
  stats: {
    totalCalculations: number;
    completedMissions: number;
    totalMissions: number;
    xpBalance: number;
    level: number;
    totalKgCO2e: number;
  };
  recentCalculations: Array<{
    calcId: string;
    category: string;
    subcategory: string | null;
    kgCO2e: number;
    createdAt: string;
  }>;
  missionProgress: Array<{
    missionId: string;
    title: string;
    status: string;
    currentProgress: number;
    target: number;
    assignedAt: string | null;
    completedAt: string | null;
  }>;
}

export default function StudentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [data, setData] = useState<StudentDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const loadStudentDetail = useCallback(async () => {
    if (!studentId) return;
    try {
      setLoading(true);
      // Usar la ruta de Next.js API que hace proxy al backend
      const response = await api<StudentDetail>(`/admin/students/${studentId}`);
      setData(response);
    } catch (e) {
      console.error('Error loading student detail:', e);
      // Si es un error 404, el estudiante no existe
      const error = e as { status?: number; message?: string };
      if (error.status === 404) {
        setData(null);
      }
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  useEffect(() => {
    if (studentId) {
      loadStudentDetail();
    }
  }, [studentId, loadStudentDetail]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="bg-white shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-gray-900">Detalle del Estudiante</h1>
              <nav className="flex space-x-4">
                <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
                <Link href="/admin/students" className="text-blue-600 font-medium">Estudiantes</Link>
              </nav>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="mb-6">
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver
            </button>
          </div>
          <div className="bg-white rounded-lg shadow p-8 text-center">
            <div className="flex flex-col items-center">
              <svg className="w-16 h-16 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Estudiante no encontrado</h2>
              <p className="text-gray-600 mb-6">
                No se encontró un estudiante con el ID: <code className="bg-gray-100 px-2 py-1 rounded text-sm">{studentId}</code>
              </p>
              <div className="flex gap-3">
                <Link
                  href="/admin/students"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Volver a Estudiantes
                </Link>
                <Link
                  href="/admin/dashboard"
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Ir al Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // TypeScript guard - data cannot be null here
  if (!data) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Detalle del Estudiante</h1>
            <nav className="flex space-x-4">
              <Link href="/admin/dashboard" className="text-gray-600 hover:text-gray-900">Dashboard</Link>
              <Link href="/admin/students" className="text-blue-600 font-medium">Estudiantes</Link>
            </nav>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Volver
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Información Personal</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Nombre</p>
                  <p className="font-medium">{data.username}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Email</p>
                  <p className="font-medium">{data.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Carrera</p>
                  <p className="font-medium">{data.carrera || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Jornada</p>
                  <p className="font-medium">{data.jornada || 'N/A'}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Últimos Cálculos</h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoría</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subcategoría</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">CO₂ (kg)</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {data.recentCalculations.map((calc) => (
                      <tr key={calc.calcId}>
                        <td className="px-4 py-3 text-sm">{calc.category}</td>
                        <td className="px-4 py-3 text-sm">{calc.subcategory || 'N/A'}</td>
                        <td className="px-4 py-3 text-sm">{calc.kgCO2e.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm">{new Date(calc.createdAt).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Progreso en Misiones</h2>
              <div className="space-y-4">
                {data.missionProgress.map((mission, idx) => (
                  <div key={idx} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium">{mission.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded ${
                        mission.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        mission.status === 'ACTIVE' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {mission.status}
                      </span>
                    </div>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm text-gray-600 mb-1">
                        <span>Progreso: {mission.currentProgress}/{mission.target}</span>
                        <span>{Math.round((mission.currentProgress / mission.target) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${Math.min((mission.currentProgress / mission.target) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">Estadísticas</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Total Cálculos</p>
                  <p className="text-2xl font-bold">{data.stats.totalCalculations}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Misiones Completadas</p>
                  <p className="text-2xl font-bold">{data.stats.completedMissions}/{data.stats.totalMissions}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">XP Balance</p>
                  <p className="text-2xl font-bold">{data.stats.xpBalance}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Nivel</p>
                  <p className="text-2xl font-bold">{data.stats.level}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total CO₂ (kg)</p>
                  <p className="text-2xl font-bold text-green-600">{data.stats.totalKgCO2e.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}








