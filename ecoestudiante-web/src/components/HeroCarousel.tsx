'use client';

import { useState, useEffect } from 'react';

const slides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1920&q=80',
    title: 'Calcula tu Huella de Carbono',
    subtitle: 'Conoce el impacto ambiental de tus actividades diarias',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1920&q=80',
    title: 'Comunidad Sostenible',
    subtitle: 'Únete a estudiantes comprometidos con el medio ambiente',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1920&q=80',
    title: 'Reduce tu Impacto',
    subtitle: 'Toma decisiones informadas para un futuro más verde',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=1920&q=80',
    title: 'Educación Ambiental',
    subtitle: 'Aprende sobre sostenibilidad mientras calculas tu impacto',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
];

export default function HeroCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000); // Cambia cada 5 segundos

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    // Reanudar auto-play después de 10 segundos
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Slides */}
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: `url(${slide.image})`,
            }}
          >
            <div
              className="absolute inset-0"
              style={{ backgroundColor: slide.overlay }}
            />
          </div>
          
          {/* Content */}
          {index === currentSlide && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white px-4 sm:px-6 lg:px-8 max-w-4xl">
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold mb-4 sm:mb-6 animate-fade-in">
                  {slide.title}
                </h1>
                <p className="text-lg sm:text-xl md:text-2xl lg:text-3xl mb-8 sm:mb-12 text-gray-200 animate-fade-in-delay">
                  {slide.subtitle}
                </p>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Navigation Arrows */}
      <button
        onClick={goToPrevious}
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 sm:p-3 rounded-full transition-all z-10 backdrop-blur-sm"
        aria-label="Slide anterior"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 sm:p-3 rounded-full transition-all z-10 backdrop-blur-sm"
        aria-label="Slide siguiente"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 sm:space-x-3 z-10">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 sm:h-3 rounded-full transition-all ${
              index === currentSlide
                ? 'w-8 sm:w-12 bg-white'
                : 'w-2 sm:w-3 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 z-10 animate-bounce">
        <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>
    </div>
  );
}

