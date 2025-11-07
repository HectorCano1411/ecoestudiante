'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api-client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

type VerifyEmailResponse = {
  message: string;
  verified: boolean;
};

type ResendVerificationResponse = {
  message: string;
  email: string;
  emailSent: boolean;
};

type ErrorResponse = {
  error: string;
  message: string;
};

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError('Token de verificación no proporcionado');
      setLoading(false);
      return;
    }

    verifyEmail(token);
  }, [token]);

  const verifyEmail = async (verificationToken: string) => {
    try {
      setLoading(true);
      const response = await api<VerifyEmailResponse>('/auth/verify-email', {
        method: 'POST',
        body: JSON.stringify({ token: verificationToken }),
      });
      
      setVerified(true);
      setError(null);
      
      // Redirigir al login después de 3 segundos
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    } catch (e: any) {
      console.error('Verify Email Error:', e);
      
      let errorMessage = 'Error al verificar el correo electrónico';
      
      if (e.message) {
        errorMessage = e.message.replace('API ', '');
      }
      
      try {
        if (e.response) {
          const errorData = await e.response.clone().json().catch(() => null);
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      
      setError(errorMessage);
      setVerified(false);
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!userEmail) {
      setError('Por favor ingresa tu correo electrónico');
      return;
    }

    setResending(true);
    setResendSuccess(false);
    setError(null);

    try {
      const response = await api<ResendVerificationResponse>('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: userEmail }),
      });

      setResendSuccess(true);
      setError(null);
    } catch (e: any) {
      let errorMessage = 'Error al reenviar el email de verificación';
      
      if (e.message) {
        errorMessage = e.message.replace('API ', '');
      }
      
      try {
        if (e.response) {
          const errorData = await e.response.clone().json().catch(() => null);
          if (errorData?.message) {
            errorMessage = errorData.message;
          }
        }
      } catch (parseError) {
        console.error('Error parsing response:', parseError);
      }
      
      setError(errorMessage);
    } finally {
      setResending(false);
    }
  };

  const isTokenExpired = error?.toLowerCase().includes('expirado');

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-green-50 to-blue-50">
      <Navbar />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            {loading && (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
                <h2 className="text-xl font-bold text-gray-800 mb-2">Verificando tu correo...</h2>
                <p className="text-gray-600">Por favor espera un momento</p>
              </div>
            )}

            {verified && !loading && (
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">¡Email Verificado!</h2>
                <p className="text-gray-600 mb-4">
                  Tu correo electrónico ha sido verificado exitosamente. Ya puedes iniciar sesión.
                </p>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-800 font-semibold mb-2">💡 Para iniciar sesión puedes usar:</p>
                  <ul className="text-sm text-blue-700 space-y-1 text-left ml-4">
                    <li>• Tu nombre de usuario</li>
                    <li>• Tu correo electrónico</li>
                  </ul>
                </div>
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                >
                  Ir a Iniciar Sesión
                </Link>
                <p className="text-sm text-gray-500 mt-4">Serás redirigido automáticamente en unos segundos...</p>
              </div>
            )}

            {error && !loading && (
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Error de Verificación</h2>
                <p className="text-gray-600 mb-6">{error}</p>
                
                {isTokenExpired && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-yellow-800 font-semibold mb-3">
                      ⏰ El enlace de verificación ha expirado
                    </p>
                    <p className="text-sm text-yellow-700 mb-4">
                      Puedes solicitar un nuevo enlace de verificación ingresando tu correo electrónico:
                    </p>
                    <div className="space-y-3">
                      <input
                        type="email"
                        placeholder="tu@correo.com"
                        value={userEmail || ''}
                        onChange={(e) => setUserEmail(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <button
                        onClick={handleResendVerification}
                        disabled={resending || !userEmail}
                        className="w-full px-6 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {resending ? 'Enviando...' : 'Reenviar Email de Verificación'}
                      </button>
                      {resendSuccess && (
                        <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                          <p className="text-sm text-green-800">
                            ✅ Se ha enviado un nuevo enlace de verificación a tu correo electrónico.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="space-y-3">
                  <Link
                    href="/login"
                    className="block w-full px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-center"
                  >
                    Ir a Iniciar Sesión
                  </Link>
                  <Link
                    href="/register"
                    className="block w-full px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-semibold text-center"
                  >
                    Volver a Registrarse
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
