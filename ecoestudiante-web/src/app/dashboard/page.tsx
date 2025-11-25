'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import DashboardMenu from '@/components/DashboardMenu';
import ElectricityForm from '@/components/ElectricityForm';
import TransportForm from '@/components/TransportForm';
import { api } from '@/lib/api-client';
import type { StatsSummary } from '@/types/calc';

export default function DashboardPage() {
  const router = useRouter();
  const { user: auth0User, isLoading: auth0Loading } = useUser();
  const [username, setUsername] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<'menu' | 'electricity' | 'transport'>('menu');
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [authMethod, setAuthMethod] = useState<'jwt' | 'auth0' | null>(null);

  useEffect(() => {
    // SOLUCIÓN: Verificar JWT PRIMERO (más rápido y no bloquea)
    // Luego verificar Auth0 si no hay JWT
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('username');
    
    if (token && user) {
      // JWT tradicional encontrado - usar inmediatamente
      setUsername(user);
      setAuthMethod('jwt');
      setLoading(false);
      return;
    }
    
    // Si no hay JWT, verificar Auth0 (pero no bloquear si está cargando)
    if (!auth0Loading) {
      if (auth0User) {
        setUsername(auth0User.name || auth0User.email || 'Usuario');
        setAuthMethod('auth0');
        setLoading(false);
        return;
      }
      
      // Si no hay ninguna autenticación, redirigir al login
      router.push('/login');
    }
    // Si auth0Loading es true, esperar un poco más antes de redirigir
  }, [router, auth0User, auth0Loading]);

  const loadStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      // Si el usuario está autenticado con Auth0, usar el proxy que incluye el token de Auth0
      // Si está autenticado con JWT, usar la API tradicional
      if (authMethod === 'auth0') {
        // Para Auth0, las llamadas deben ir a través del proxy o usar el endpoint que maneja Auth0
        // Por ahora, intentamos con la API tradicional (puede que necesite ajustes en el backend)
        const data = await api<StatsSummary>('/stats/summary');
        setStats(data);
      } else {
        const data = await api<StatsSummary>('/stats/summary');
        setStats(data);
      }
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [authMethod]);

  useEffect(() => {
    // Cargar estadísticas cuando se muestra el menú
    if (activeSection === 'menu' && !loading) {
      loadStats();
    }
  }, [activeSection, loading, loadStats]);

  const handleLogout = () => {
    if (authMethod === 'auth0') {
      // Logout de Auth0
      window.location.href = '/api/auth/logout';
    } else {
      // Logout JWT tradicional
      localStorage.removeItem('authToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('username');
      localStorage.removeItem('userId');
      router.push('/login');
    }
  };

  if (loading) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-gradient-to-br from-green-50 via-blue-50 to-green-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-xl font-bold">E</span>
              </div>
              <h1 className="text-xl font-bold text-gray-800">EcoEstudiante</h1>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/analytics')}
                className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors"
              >
                📊 Análisis
              </button>
              <button
                onClick={() => router.push('/history')}
                className="px-4 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Ver Historial
              </button>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-800">{username}</p>
                <p className="text-xs text-gray-500">Sesión activa</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Breadcrumb */}
        <div className="mb-6">
          {(activeSection === 'electricity' || activeSection === 'transport') && (
            <button
              onClick={() => setActiveSection('menu')}
              className="text-sm text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <span>←</span> Volver al menú
            </button>
          )}
        </div>

        {/* Page Title */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {activeSection === 'menu' 
              ? 'Mi Huella de Carbono' 
              : activeSection === 'electricity'
              ? 'Registrar Consumo Eléctrico'
              : 'Registrar Transporte'}
          </h2>
          <p className="text-gray-600">
            {activeSection === 'menu' 
              ? 'Selecciona una categoría para registrar tu huella de carbono'
              : activeSection === 'electricity'
              ? 'Ingresa los datos de tu consumo eléctrico mensual'
              : 'Registra tus viajes y calcula las emisiones de transporte'}
          </p>
        </div>

        {/* Content */}
        {activeSection === 'menu' ? (
          <div>
            <DashboardMenu onItemClick={(itemId) => {
              if (itemId === 'electricity') setActiveSection('electricity');
              if (itemId === 'transport') setActiveSection('transport');
            }} />
            <div className="mt-8 p-6 bg-white rounded-xl border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Comienza Ahora
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div 
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-green-200 bg-green-50 cursor-pointer hover:bg-green-100 transition-colors"
                  onClick={() => setActiveSection('electricity')}
                >
                  <div className="w-12 h-12 bg-yellow-500 text-white text-2xl rounded-lg flex items-center justify-center">
                    ⚡
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-800">Registrar Consumo Eléctrico</h4>
                    <p className="text-sm text-gray-600">Comienza registrando tu consumo eléctrico mensual</p>
                  </div>
                  <span className="text-green-600 font-medium text-xl">→</span>
                </div>
                <div 
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-blue-200 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors"
                  onClick={() => setActiveSection('transport')}
                >
                  <div className="w-12 h-12 bg-blue-500 text-white text-2xl rounded-lg flex items-center justify-center">
                    🚗
                  </div>
                  <div className="flex-1">
                    <h4 className="text-base font-semibold text-gray-800">Registrar Transporte</h4>
                    <p className="text-sm text-gray-600">Registra tus viajes y calcula emisiones de movilidad</p>
                  </div>
                  <span className="text-blue-600 font-medium text-xl">→</span>
                </div>
              </div>
            </div>
          </div>
        ) : activeSection === 'electricity' ? (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-yellow-500 text-white text-xl rounded-lg flex items-center justify-center">
                  ⚡
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Registrar Consumo Eléctrico</h3>
              </div>
              <p className="text-sm text-gray-600 ml-14">
                Calcula tu huella de carbono basada en tu consumo eléctrico mensual
              </p>
            </div>
            
            <ElectricityForm onSuccess={loadStats} />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 md:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500 text-white text-xl rounded-lg flex items-center justify-center">
                  🚗
                </div>
                <h3 className="text-xl font-semibold text-gray-800">Registrar Transporte</h3>
              </div>
              <p className="text-sm text-gray-600 ml-14">
                Selecciona origen y destino en el mapa o ingresa la distancia manualmente
              </p>
            </div>
            
            <TransportForm onSuccess={loadStats} />
          </div>
        )}

        {/* Stats Card */}
        {activeSection === 'menu' && (
          <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Registros Totales</p>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 w-16 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-gray-800">
                      {stats?.totalRecords ?? 0}
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📊</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Huella Total</p>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-green-600">
                      {stats?.totalKgCO2e.toFixed(2) ?? '0.00'} kg CO₂e
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">🌱</span>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Este Mes</p>
                  {loadingStats ? (
                    <div className="animate-pulse h-8 w-24 bg-gray-200 rounded"></div>
                  ) : (
                    <p className="text-2xl font-bold text-yellow-600">
                      {stats?.thisMonthKgCO2e.toFixed(2) ?? '0.00'} kg CO₂e
                    </p>
                  )}
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">📅</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
