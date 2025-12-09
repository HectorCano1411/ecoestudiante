'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface User {
  id: string;
  username: string;
  email: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'PROFESOR' | 'ESTUDIANTE';
  enabled: boolean;
  emailVerified: boolean;
  carrera?: string;
  jornada?: string;
  authProvider?: string;
  institutionId?: string;
  institutionName?: string;
  campusId?: string;
  campusName?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Institution {
  id: string;
  name: string;
  type: string;
}

interface Campus {
  id: string;
  name: string;
  institutionId: string;
}

interface UserListResponse {
  users: User[];
  totalElements: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Administrador', color: 'bg-red-100 text-red-800' },
  { value: 'ADMIN', label: 'Administrador', color: 'bg-purple-100 text-purple-800' },
  { value: 'PROFESOR', label: 'Profesor', color: 'bg-blue-100 text-blue-800' },
  { value: 'ESTUDIANTE', label: 'Estudiante', color: 'bg-green-100 text-green-800' },
] as const;

// Opciones de carrera utilizadas en el proyecto
const CARRERAS = [
  'Ingeniería en Informática',
  'Ingeniería Civil',
  'Ingeniería Industrial',
  'Ingeniería Comercial',
  'Ingeniería en Construcción',
  'Psicología',
  'Derecho',
  'Medicina',
  'Enfermería',
  'Pedagogía',
  'Arquitectura',
  'Diseño',
  'Administración Pública',
  'Contador Público',
  'Trabajo Social',
] as const;

// Opciones de jornada utilizadas en el proyecto
const JORNADAS = [
  'Diurna',
  'Vespertina',
  'Nocturna',
  'Mixta',
  'Ejecutiva',
] as const;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [enabledFilter, setEnabledFilter] = useState<boolean | null>(null);
  const [emailVerifiedFilter, setEmailVerifiedFilter] = useState<boolean | null>(null);
  const [institutionFilter, setInstitutionFilter] = useState<string>('');
  const [campusFilter, setCampusFilter] = useState<string>('');
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  useEffect(() => {
    // Verificar rol de admin, super admin o profesor
    const userRole = localStorage.getItem('userRole');
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN' && userRole !== 'PROFESOR') {
      router.push('/admin/login');
      return;
    }

    loadUsers();
    loadInstitutions();
  }, [page, pageSize, search, roleFilter, enabledFilter, emailVerifiedFilter, institutionFilter, campusFilter, router]);

  useEffect(() => {
    if (institutionFilter) {
      loadCampusesForFilter(institutionFilter);
    } else {
      setCampuses([]);
      setCampusFilter('');
    }
  }, [institutionFilter]);

  const loadInstitutions = async () => {
    try {
      setLoadingInstitutions(true);
      const response = await api<{ institutions: Institution[] }>("/institutions?page=0&size=100&enabled=true");
      setInstitutions(response.institutions || []);
    } catch (err: any) {
      console.error("Error al cargar instituciones:", err);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const loadCampusesForFilter = async (institutionId: string) => {
    try {
      const response = await api<{ campuses: Campus[] }>(`/institutions/campuses?institutionId=${institutionId}&page=0&size=100&enabled=true`);
      setCampuses(response.campuses || []);
    } catch (err: any) {
      console.error("Error al cargar campus:", err);
      setCampuses([]);
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: page.toString(),
        size: pageSize.toString(),
      });

      if (search.trim()) {
        params.append('search', search.trim());
      }
      if (roleFilter) {
        params.append('role', roleFilter);
      }
      if (enabledFilter !== null) {
        params.append('enabled', enabledFilter.toString());
      }
      if (emailVerifiedFilter !== null) {
        params.append('emailVerified', emailVerifiedFilter.toString());
      }
      if (institutionFilter) {
        params.append('institutionId', institutionFilter);
      }
      if (campusFilter) {
        params.append('campusId', campusFilter);
      }

      const response = await api<UserListResponse>(`/users?${params.toString()}`);
      setUsers(response.users);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (err: any) {
      console.error('Error loading users:', err);
      setError(err.message || 'Error al cargar usuarios');
      if (err.status === 401 || err.status === 403) {
        router.push('/admin/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      return;
    }

    try {
      await api(`/users/${userId}`, { method: 'DELETE' });
      loadUsers();
    } catch (err: any) {
      alert('Error al eliminar usuario: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleToggleEnabled = async (userId: string, currentEnabled: boolean) => {
    try {
      await api(`/users/${userId}/toggle-enabled?enabled=${!currentEnabled}`, {
        method: 'PUT',
      });
      loadUsers();
    } catch (err: any) {
      alert('Error al cambiar estado: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleVerifyEmail = async (userId: string) => {
    if (!confirm('¿Estás seguro de que deseas verificar el email de este usuario?')) {
      return;
    }

    try {
      await api(`/users/${userId}/verify-email`, {
        method: 'PUT',
      });
      alert('Email verificado exitosamente');
      loadUsers();
    } catch (err: any) {
      alert('Error al verificar email: ' + (err.message || 'Error desconocido'));
    }
  };

  const handleResendVerificationEmail = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Deseas reenviar el email de verificación a ${userEmail}?`)) {
      return;
    }

    try {
      await api(`/users/${userId}/resend-verification-email`, {
        method: 'POST',
      });
      alert('Email de verificación reenviado exitosamente');
    } catch (err: any) {
      alert('Error al reenviar email: ' + (err.message || 'Error desconocido'));
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLES.find(r => r.value === role)?.label || role;
  };

  const getRoleColor = (role: string) => {
    return ROLES.find(r => r.value === role)?.color || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link
                  href="/admin/dashboard"
                  className="text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                  title="Volver al Dashboard"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  <span className="text-sm font-medium">Dashboard</span>
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
              <p className="text-gray-600 mt-1">Administra usuarios del sistema</p>
            </div>
            <div className="flex gap-3">
              <Link
                href="/admin/dashboard"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                title="Volver al Dashboard"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Dashboard
              </Link>
              <button
                onClick={() => {
                  setEditingUser(null);
                  setShowCreateModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Usuario
              </button>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Username o email..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                {ROLES.map(role => (
                  <option key={role.value} value={role.value}>{role.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={enabledFilter === null ? '' : enabledFilter.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setEnabledFilter(value === '' ? null : value === 'true');
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Habilitados</option>
                <option value="false">Deshabilitados</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Verificado</label>
              <select
                value={emailVerifiedFilter === null ? '' : emailVerifiedFilter.toString()}
                onChange={(e) => {
                  const value = e.target.value;
                  setEmailVerifiedFilter(value === '' ? null : value === 'true');
                  setPage(0);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos</option>
                <option value="true">Verificados</option>
                <option value="false">No verificados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tabla */}
        {loading ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando usuarios...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadUsers}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Usuario
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email Verificado
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Institución / Campus
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                          No se encontraron usuarios
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            {user.carrera && (
                              <div className="text-sm text-gray-500">{user.carrera}</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{user.email}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                              {getRoleLabel(user.role)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() => handleToggleEnabled(user.id, user.enabled)}
                              className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                user.enabled
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {user.enabled ? 'Habilitado' : 'Deshabilitado'}
                            </button>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                user.emailVerified
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-yellow-100 text-yellow-800'
                              }`}>
                                {user.emailVerified ? 'Verificado' : 'No verificado'}
                              </span>
                              {!user.emailVerified && (
                                <button
                                  onClick={() => handleVerifyEmail(user.id)}
                                  className="text-green-600 hover:text-green-900"
                                  title="Verificar email manualmente"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {user.institutionName ? (
                              <div className="text-sm">
                                <div className="font-medium text-gray-900">{user.institutionName}</div>
                                {user.campusName && (
                                  <div className="text-gray-500">{user.campusName}</div>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">No asignado</span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  setEditingUser(user);
                                  setShowCreateModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900"
                                title="Editar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              {!user.emailVerified && (
                                <button
                                  onClick={() => handleResendVerificationEmail(user.id, user.email)}
                                  className="text-purple-600 hover:text-purple-900"
                                  title="Reenviar email de verificación"
                                >
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                  </svg>
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(user.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Eliminar"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Paginación */}
            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Mostrando {users.length > 0 ? page * pageSize + 1 : 0} a {Math.min((page + 1) * pageSize, totalElements)} de {totalElements} usuarios
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Anterior
                </button>
                <span className="px-4 py-2 text-gray-700">
                  Página {page + 1} de {totalPages || 1}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-4 py-2 border border-gray-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
          </>
        )}

        {/* Modal de Crear/Editar */}
        {showCreateModal && (
          <UserFormModal
            user={editingUser}
            onClose={() => {
              setShowCreateModal(false);
              setEditingUser(null);
            }}
            onSuccess={() => {
              setShowCreateModal(false);
              setEditingUser(null);
              loadUsers();
            }}
          />
        )}
      </div>
    </div>
  );
}

// Componente de Modal para Crear/Editar Usuario
function UserFormModal({
  user,
  onClose,
  onSuccess,
}: {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    username: user?.username || '',
    email: user?.email || '',
    password: '',
    role: user?.role || 'ESTUDIANTE',
    carrera: user?.carrera || '',
    jornada: user?.jornada || '',
    institutionId: user?.institutionId || '',
    campusId: user?.campusId || '',
    enabled: user?.enabled !== undefined ? user.enabled : true,
    emailVerified: user?.emailVerified !== undefined ? user.emailVerified : false,
  });
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [loadingCampuses, setLoadingCampuses] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInstitutions();
    if (user?.institutionId) {
      loadCampuses(user.institutionId);
    }
  }, []);

  useEffect(() => {
    if (formData.institutionId) {
      loadCampuses(formData.institutionId);
      if (user?.institutionId !== formData.institutionId) {
        setFormData(prev => ({ ...prev, campusId: '' }));
      }
    } else {
      setCampuses([]);
    }
  }, [formData.institutionId]);

  const loadInstitutions = async () => {
    try {
      setLoadingInstitutions(true);
      const response = await api<{ institutions: Institution[] }>("/institutions?page=0&size=100&enabled=true");
      setInstitutions(response.institutions || []);
    } catch (err: any) {
      console.error("Error al cargar instituciones:", err);
    } finally {
      setLoadingInstitutions(false);
    }
  };

  const loadCampuses = async (institutionId: string) => {
    try {
      setLoadingCampuses(true);
      const response = await api<{ campuses: Campus[] }>(`/institutions/campuses?institutionId=${institutionId}&page=0&size=100&enabled=true`);
      setCampuses(response.campuses || []);
    } catch (err: any) {
      console.error("Error al cargar campus:", err);
      setCampuses([]);
    } finally {
      setLoadingCampuses(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (user) {
        // Actualizar
        const updateData: any = {
          username: formData.username,
          email: formData.email,
          role: formData.role,
          carrera: formData.carrera,
          jornada: formData.jornada,
          enabled: formData.enabled,
          emailVerified: formData.emailVerified,
        };
        
        if (formData.institutionId) {
          updateData.institutionId = formData.institutionId;
        }
        if (formData.campusId) {
          updateData.campusId = formData.campusId;
        }
        await api(`/users/${user.id}`, {
          method: 'PUT',
          body: JSON.stringify(updateData),
        });
      } else {
        // Crear - Limpiar y validar datos antes de enviar
        const createData: any = {
          username: formData.username.trim(),
          email: formData.email.trim().toLowerCase(),
          password: formData.password,
          role: formData.role,
        };
        
        // Validaciones básicas
        if (!createData.username || createData.username.length < 3) {
          setError('El username debe tener al menos 3 caracteres');
          return;
        }
        if (!createData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(createData.email)) {
          setError('El email debe ser válido');
          return;
        }
        if (!createData.password || createData.password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          return;
        }
        if (!createData.role) {
          setError('El rol es requerido');
          return;
        }
        
        // Solo agregar campos opcionales si tienen valor (no vacíos)
        if (formData.carrera && formData.carrera.trim()) {
          createData.carrera = formData.carrera.trim();
        }
        if (formData.jornada && formData.jornada.trim()) {
          createData.jornada = formData.jornada.trim();
        }
        if (formData.institutionId) {
          createData.institutionId = formData.institutionId;
        }
        if (formData.campusId) {
          createData.campusId = formData.campusId;
        }
        
        // Siempre enviar enabled y emailVerified como boolean
        createData.enabled = formData.enabled === true;
        createData.emailVerified = formData.emailVerified === true;
        
        console.log('Enviando datos de creación:', { ...createData, password: '***' });
        
        await api('/users', {
          method: 'POST',
          body: JSON.stringify(createData),
        });
      }
      onSuccess();
    } catch (err: any) {
      console.error('Error al guardar usuario:', err);
      console.error('Error completo:', JSON.stringify(err, null, 2));
      
      // Extraer mensaje de error más descriptivo
      let errorMessage = 'Error al guardar usuario';
      
      // Intentar extraer del mensaje del error
      if (err.message) {
        // Si el mensaje contiene "BACKEND", extraer solo la parte útil
        if (err.message.includes('BACKEND')) {
          const match = err.message.match(/BACKEND \d+: (.+)/);
          errorMessage = match ? match[1] : err.message;
        } else {
          errorMessage = err.message;
        }
      }
      
      // Intentar extraer del objeto error
      if (err.error) {
        if (typeof err.error === 'string') {
          errorMessage = err.error;
        } else if (err.error.message) {
          errorMessage = err.error.message;
        } else if (err.error.error?.message) {
          errorMessage = err.error.error.message;
        } else if (err.error.error && typeof err.error.error === 'string') {
          errorMessage = err.error.error;
        }
      }
      
      // Si es un error de validación (400 o 422), mostrar detalles
      if (err.status === 400 || err.status === 422) {
        // Intentar obtener detalles de validación
        let validationDetails: any[] = [];
        
        if (err.error?.details && Array.isArray(err.error.details)) {
          validationDetails = err.error.details;
        } else if (err.error?.error?.details && Array.isArray(err.error.error.details)) {
          validationDetails = err.error.error.details;
        } else if (err.details && Array.isArray(err.details)) {
          validationDetails = err.details;
        }
        
        if (validationDetails.length > 0) {
          const validationMessages = validationDetails
            .map((d: any) => {
              const field = d.field || d.path || 'campo';
              const message = d.message || d.defaultMessage || 'error de validación';
              return `${field}: ${message}`;
            })
            .join('; ');
          errorMessage = `Error de validación: ${validationMessages}`;
        } else {
          // Si no hay detalles, usar el mensaje genérico
          errorMessage = errorMessage || 'Error de validación. Verifica que todos los campos sean correctos.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900">
              {user ? 'Editar Usuario' : 'Crear Usuario'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {!user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required={!user}
                  minLength={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Mínimo 8 caracteres, debe incluir mayúscula, minúscula, número y símbolo
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {ROLES.map(role => (
                    <option key={role.value} value={role.value}>{role.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Jornada</label>
                <select
                  value={formData.jornada}
                  onChange={(e) => setFormData({ ...formData, jornada: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Seleccionar jornada</option>
                  {JORNADAS.map(jornada => (
                    <option key={jornada} value={jornada}>{jornada}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Carrera</label>
              <select
                value={formData.carrera}
                onChange={(e) => setFormData({ ...formData, carrera: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Seleccionar carrera</option>
                {CARRERAS.map(carrera => (
                  <option key={carrera} value={carrera}>{carrera}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institución</label>
              <select
                value={formData.institutionId}
                onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                disabled={loadingInstitutions}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {loadingInstitutions ? "Cargando..." : "Seleccionar institución"}
                </option>
                {institutions.map(inst => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Campus/Sede</label>
              <select
                value={formData.campusId}
                onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
                disabled={loadingCampuses || !formData.institutionId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                <option value="">
                  {!formData.institutionId 
                    ? "Primero selecciona una institución"
                    : loadingCampuses 
                    ? "Cargando..." 
                    : "Seleccionar campus"}
                </option>
                {campuses.map(campus => (
                  <option key={campus.id} value={campus.id}>{campus.name}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="enabled" className="text-sm font-medium text-gray-700">
                  Habilitado
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="emailVerified"
                  checked={formData.emailVerified}
                  onChange={(e) => setFormData({ ...formData, emailVerified: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="emailVerified" className="text-sm font-medium text-gray-700">
                  Email Verificado
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Guardando...' : user ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

