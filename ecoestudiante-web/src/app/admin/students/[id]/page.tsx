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
      const response = await api<StudentDetail>(`/v1/admin/students/${studentId}`);
      setData(response);
    } catch (e) {
      console.error('Error loading student detail:', e);
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

  if (!data) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-red-600">Estudiante no encontrado</p>
        </div>
      </div>
    );
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




