/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
// useRouter is not used in this component but may be needed in the future
// import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api-client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import UniversityCarousel from "@/components/UniversityCarousel";
import { validatePassword } from "@/utils/passwordValidator";

type RegisterResponse = {
  message: string;
  email: string;
  emailSent: boolean;
};


const CARRERAS = [
  "Ingeniería en Informática",
  "Ingeniería Industrial",
  "Ingeniería Civil",
  "Ingeniería Ambiental",
  "Ingeniería Comercial",
  "Psicología",
  "Medicina",
  "Derecho",
  "Pedagogía",
  "Arquitectura",
  "Otra",
];

const JORNADAS = [
  "Diurna",
  "Vespertina",
  "Nocturna",
  "Mixta",
];

export default function RegisterPage() {
  // router is not used in this component but may be needed in the future
  // const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [carrera, setCarrera] = useState("");
  const [jornada, setJornada] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<{ isValid: boolean; errors: string[]; strength: 'weak' | 'medium' | 'strong' } | null>(null);
  const [showPasswordRequirements, setShowPasswordRequirements] = useState(false);

  async function doRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    // Validaciones
    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden");
      setLoading(false);
      return;
    }

    // Validar contraseña fuerte
    const validation = validatePassword(password);
    if (!validation.isValid) {
      setError(`La contraseña debe cumplir con los requisitos de seguridad: ${validation.errors.join(', ')}`);
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }

    try {
      const response = await api<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ 
          username, 
          email, 
          password,
          carrera,
          jornada
        }),
      });

      setSuccess(true);
      setRegisteredEmail(response.email);
      setEmailSent(response.emailSent);
      
      // Si el email no se pudo enviar, mostrar advertencia
      if (!response.emailSent) {
        setError("email-not-sent"); // Marcador especial para mostrar advertencia
      } else {
        setError(null);
      }
    } catch (e: any) {
      console.error('Register Error:', e);
      
      let errorMessage = "Error al registrar usuario";
      
      if (e.status) {
        if (e.status === 400) {
          errorMessage = "Datos inválidos. Verifica que todos los campos estén correctos";
        } else if (e.status === 422) {
          errorMessage = "Error de validación. Verifica los datos ingresados";
        }
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
      
      if (e.message) {
        errorMessage = e.message.replace('API ', '');
      }
      
      setError(errorMessage);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section con Carrusel Universitario */}
      <section className="relative flex-1">
        <UniversityCarousel />
        
        {/* Formulario de Registro superpuesto */}
        <div className="absolute inset-0 flex items-center justify-center z-20 px-4 sm:px-6 lg:px-8 py-8 sm:py-12 overflow-y-auto">
          <div className="w-full max-w-lg my-auto">
            <form onSubmit={doRegister} className="bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl p-6 sm:p-8 space-y-6 border border-white/20">
              {/* Header */}
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                    <span className="text-white text-2xl font-bold">E</span>
                  </div>
                </div>
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Crear Cuenta</h1>
                <p className="text-gray-600">Únete a EcoEstudiante</p>
              </div>

              {/* Error Message */}
              {error && !success && (
                <div className="p-4 rounded-lg bg-red-50 border border-red-200 animate-fade-in">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-sm text-red-600 flex-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {success && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h3 className="text-sm font-medium text-green-800">¡Registro exitoso!</h3>
                    <div className="mt-2 text-sm text-green-700">
                      {registeredEmail && (
                        <>
                          <p>Tu cuenta ha sido creada con el email:</p>
                          <p className="font-semibold mt-1">{registeredEmail}</p>
                        </>
                      )}
                      
                      {!emailSent ? (
                        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <div className="flex items-start">
                            <div className="flex-shrink-0">
                              <svg className="h-5 w-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div className="ml-3 flex-1">
                              <p className="font-semibold text-yellow-800 mb-2">⚠️ Email de verificación no enviado</p>
                              <p className="text-yellow-700 text-xs mb-2">
                                Tu cuenta se creó correctamente, pero hubo un problema técnico al enviar el email de verificación.
                              </p>
                              <p className="text-yellow-700 text-xs font-semibold mt-3 mb-2">
                                ¿Qué hacer ahora?
                              </p>
                              <ul className="text-yellow-700 text-xs mt-1 ml-4 list-disc space-y-1">
                                <li>Contacta al administrador para verificar tu cuenta manualmente</li>
                                <li>O intenta registrarte nuevamente más tarde</li>
                                <li>Revisa que tu email sea correcto: <span className="font-mono font-semibold">{registeredEmail}</span></li>
                              </ul>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="mt-2">Te hemos enviado un correo de verificación a:</p>
                          <p className="font-semibold mt-1">{registeredEmail}</p>
                          <p className="mt-2">Por favor revisa tu bandeja de entrada y haz clic en el enlace para verificar tu cuenta.</p>
                          <p className="text-xs mt-2 text-green-600">💡 Si no encuentras el email, revisa tu carpeta de spam.</p>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

              {/* Form Fields */}
              {!success && (
                <>
                  <div className="space-y-2">
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                    Usuario <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="username"
                    type="text"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Elige un nombre de usuario"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                    maxLength={50}
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500">Mínimo 3 caracteres</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Correo Electrónico <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="tu@correo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2 sm:col-span-2">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Contraseña <span className="text-red-500">*</span>
                      <span className="text-xs font-normal text-gray-500 ml-2">(Requisitos profesionales)</span>
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type="password"
                        className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Mínimo 8 caracteres con mayúsculas, minúsculas, números y símbolos"
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value);
                          const validation = validatePassword(e.target.value);
                          setPasswordValidation(validation);
                          setShowPasswordRequirements(true);
                        }}
                        onFocus={() => setShowPasswordRequirements(true)}
                        required
                        minLength={8}
                        disabled={loading}
                      />
                      {passwordValidation && password.length > 0 && (
                        <div className="mt-2">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xs font-medium text-gray-600">Seguridad:</span>
                            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all ${
                                  passwordValidation.strength === 'weak'
                                    ? 'bg-red-500 w-1/3'
                                    : passwordValidation.strength === 'medium'
                                    ? 'bg-yellow-500 w-2/3'
                                    : 'bg-green-500 w-full'
                                }`}
                              />
                            </div>
                            <span className={`text-xs font-semibold ${
                              passwordValidation.strength === 'weak'
                                ? 'text-red-600'
                                : passwordValidation.strength === 'medium'
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}>
                              {passwordValidation.strength === 'weak' ? 'Débil' : passwordValidation.strength === 'medium' ? 'Media' : 'Fuerte'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {showPasswordRequirements && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-xs font-semibold text-blue-900 mb-2">🔒 Requisitos de contraseña profesional:</p>
                        <ul className="text-xs text-blue-800 space-y-1">
                          <li className={`flex items-center gap-2 ${password.length >= 8 ? 'text-green-700 font-medium' : ''}`}>
                            {password.length >= 8 ? '✅' : '○'} Al menos 8 caracteres
                          </li>
                          <li className={`flex items-center gap-2 ${/[A-Z]/.test(password) ? 'text-green-700 font-medium' : ''}`}>
                            {/[A-Z]/.test(password) ? '✅' : '○'} Al menos una mayúscula (A-Z)
                          </li>
                          <li className={`flex items-center gap-2 ${/[a-z]/.test(password) ? 'text-green-700 font-medium' : ''}`}>
                            {/[a-z]/.test(password) ? '✅' : '○'} Al menos una minúscula (a-z)
                          </li>
                          <li className={`flex items-center gap-2 ${/[0-9]/.test(password) ? 'text-green-700 font-medium' : ''}`}>
                            {/[0-9]/.test(password) ? '✅' : '○'} Al menos un número (0-9)
                          </li>
                          <li className={`flex items-center gap-2 ${/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-green-700 font-medium' : ''}`}>
                            {/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✅' : '○'} Al menos un símbolo (!@#$%^&*...)
                          </li>
                        </ul>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                      Confirmar Contraseña <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Repite la contraseña"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={8}
                      disabled={loading}
                    />
                    {confirmPassword && password !== confirmPassword && (
                      <p className="text-xs text-red-600 mt-1">⚠️ Las contraseñas no coinciden</p>
                    )}
                    {confirmPassword && password === confirmPassword && password.length > 0 && passwordValidation?.isValid && (
                      <p className="text-xs text-green-600 mt-1">✅ Las contraseñas coinciden</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="carrera" className="block text-sm font-medium text-gray-700">
                    Carrera <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="carrera"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white"
                    value={carrera}
                    onChange={(e) => setCarrera(e.target.value)}
                    required
                    disabled={loading}
                  >
                    <option value="" className="text-gray-500">Selecciona tu carrera</option>
                    {CARRERAS.map((c) => (
                      <option key={c} value={c} className="text-gray-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="jornada" className="block text-sm font-medium text-gray-700">
                    Jornada <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {JORNADAS.map((j) => (
                      <label
                        key={j}
                        className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          jornada === j
                            ? "border-green-500 bg-green-50 text-green-700"
                            : "border-gray-300 hover:border-green-300"
                        }`}
                      >
                        <input
                          type="radio"
                          name="jornada"
                          value={j}
                          checked={jornada === j}
                          onChange={(e) => setJornada(e.target.value)}
                          className="sr-only"
                          required
                          disabled={loading}
                        />
                        <span className="text-sm font-medium text-gray-900">{j}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-green-600 text-white py-2.5 px-4 font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Registrando...
                    </span>
                  ) : (
                    "Registrarse"
                  )}
                </button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">O regístrate con</span>
                  </div>
                </div>

                {/* Auth0 Register Button */}
                <Link
                  href="/api/auth/login"
                  className="block w-full py-3 px-4 rounded-lg border-2 border-blue-600 text-blue-600 font-semibold hover:bg-blue-50 transition-all text-center flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M21.98 7.448L19.62 0H4.347L2.02 7.448c-1.352 4.636.258 9.659 3.768 12.37L12 24l6.212-4.182c3.51-2.711 5.12-7.734 3.768-12.37zm-9.98 5.554c-3.313 0-6-2.687-6-6s2.687-6 6-6 6 2.687 6 6-2.687 6-6 6z"/>
                  </svg>
                  Auth0 (Google, Email, etc.)
                </Link>

                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    ¿Ya tienes cuenta?{" "}
                    <Link href="/login" className="text-green-600 hover:text-green-700 font-medium">
                      Inicia sesión
                    </Link>
                  </p>
                </div>
              </>
              )}

              {/* Success Actions */}
              {success && (
                <div className="text-center">
                  <Link
                    href="/login"
                    className="text-green-600 hover:text-green-700 font-medium text-sm"
                  >
                    Ir a Iniciar Sesión
                  </Link>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>
      
      <Footer />
    </div>
  );
}
