'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@auth0/nextjs-auth0/client';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import HeroCarousel from '@/components/HeroCarousel';
import Link from 'next/link';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useUser();

  // Si el usuario está autenticado con Auth0, redirigir al dashboard principal
  useEffect(() => {
    if (!isLoading && user) {
      // Si hay un usuario de Auth0 autenticado, redirigir al dashboard principal
      // Esto maneja el caso cuando Auth0 redirige a / después del callback
      router.replace('/dashboard');
    }
  }, [user, isLoading, router]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      {/* Hero Section con Carrusel */}
      <section className="relative">
        <HeroCarousel />
      </section>

      {/* Sección de Características */}
      <section className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              ¿Por qué EcoEstudiante?
            </h2>
            <p className="text-lg sm:text-xl text-gray-600 max-w-3xl mx-auto">
              Herramientas profesionales para calcular y reducir tu huella de carbono
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {/* Feature 1 */}
            <div className="bg-green-50 rounded-xl p-6 sm:p-8 border border-green-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-500 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl">📊</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Cálculo Preciso
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Utiliza factores de emisión oficiales y actualizados para obtener resultados precisos
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-blue-50 rounded-xl p-6 sm:p-8 border border-blue-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-500 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl">📈</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Historial Detallado
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Mantén un registro completo de tus cálculos y visualiza tu progreso a lo largo del tiempo
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-yellow-50 rounded-xl p-6 sm:p-8 border border-yellow-100 hover:shadow-lg transition-shadow">
              <div className="w-12 h-12 sm:w-16 sm:h-16 bg-yellow-500 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                <span className="text-2xl sm:text-3xl">🌱</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-3 sm:mb-4">
                Educación Ambiental
              </h3>
              <p className="text-gray-600 text-sm sm:text-base">
                Aprende sobre sostenibilidad mientras calculas tu impacto ambiental
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sección Sobre Nosotros */}
      <section id="sobre-nosotros" className="py-16 sm:py-20 lg:py-24 bg-gradient-to-br from-green-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 sm:gap-12 items-center">
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6 sm:mb-8">
                Sobre Nosotros
              </h2>
              <p className="text-lg sm:text-xl text-gray-700 mb-4 sm:mb-6">
                EcoEstudiante es una plataforma diseñada específicamente para estudiantes que desean 
                tomar conciencia sobre su impacto ambiental y tomar medidas para reducirlo.
              </p>
              <p className="text-lg sm:text-xl text-gray-700 mb-6 sm:mb-8">
                Nuestra misión es proporcionar herramientas precisas y fáciles de usar para calcular 
                la huella de carbono, permitiendo a los estudiantes hacer decisiones informadas sobre 
                su estilo de vida.
              </p>
              <Link
                href="/register"
                className="inline-block px-6 sm:px-8 py-3 sm:py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold text-base sm:text-lg"
              >
                Comienza Ahora
              </Link>
            </div>
            <div className="relative">
              <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="grid grid-cols-2 gap-4 sm:gap-6">
                  <div className="text-center p-4 sm:p-6 bg-green-50 rounded-lg">
                    <div className="text-3xl sm:text-4xl font-bold text-green-600 mb-2">1000+</div>
                    <div className="text-sm sm:text-base text-gray-600">Estudiantes</div>
                  </div>
                  <div className="text-center p-4 sm:p-6 bg-blue-50 rounded-lg">
                    <div className="text-3xl sm:text-4xl font-bold text-blue-600 mb-2">5000+</div>
                    <div className="text-sm sm:text-base text-gray-600">Cálculos</div>
                  </div>
                  <div className="text-center p-4 sm:p-6 bg-yellow-50 rounded-lg">
                    <div className="text-3xl sm:text-4xl font-bold text-yellow-600 mb-2">50+</div>
                    <div className="text-sm sm:text-base text-gray-600">Países</div>
                  </div>
                  <div className="text-center p-4 sm:p-6 bg-purple-50 rounded-lg">
                    <div className="text-3xl sm:text-4xl font-bold text-purple-600 mb-2">24/7</div>
                    <div className="text-sm sm:text-base text-gray-600">Disponible</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sección CTA */}
      <section className="py-16 sm:py-20 lg:py-24 bg-gradient-to-r from-green-600 to-green-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 sm:mb-6">
            ¿Listo para comenzar?
          </h2>
          <p className="text-lg sm:text-xl text-green-100 mb-8 sm:mb-12">
            Únete a miles de estudiantes que ya están tomando acción para un futuro más sostenible
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center">
            <Link
              href="/register"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-white text-green-600 rounded-lg hover:bg-gray-100 transition-colors font-semibold text-base sm:text-lg"
            >
              Crear Cuenta Gratis
            </Link>
            <Link
              href="/login"
              className="px-6 sm:px-8 py-3 sm:py-4 bg-transparent border-2 border-white text-white rounded-lg hover:bg-white/10 transition-colors font-semibold text-base sm:text-lg"
            >
              Iniciar Sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Sección Contacto */}
      <section id="contacto" className="py-16 sm:py-20 lg:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
              Contáctanos
            </h2>
            <p className="text-lg sm:text-xl text-gray-600">
              ¿Tienes preguntas? Estamos aquí para ayudarte
            </p>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 lg:p-12">
            <form className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="name"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Tu nombre"
                  />
                </div>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="tu@email.com"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Mensaje
                </label>
                <textarea
                  id="message"
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Tu mensaje..."
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto px-8 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
              >
                Enviar Mensaje
              </button>
            </form>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
