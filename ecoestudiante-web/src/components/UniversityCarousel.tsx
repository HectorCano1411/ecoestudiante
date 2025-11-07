'use client';

import { useState, useEffect } from 'react';

// Imágenes específicas de ecosustentabilidad universitaria
const universitySlides = [
  {
    id: 1,
    image: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=1920&q=80',
    title: 'Sustentabilidad Universitaria',
    subtitle: 'Únete a una comunidad de estudiantes comprometidos con el medio ambiente',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  {
    id: 2,
    image: 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=1920&q=80',
    title: 'Campus Verde',
    subtitle: 'Participa en iniciativas ambientales en tu universidad',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  {
    id: 3,
    image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?w=1920&q=80',
    title: 'Educación Ambiental',
    subtitle: 'Aprende y aplica conocimientos sobre sostenibilidad',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  {
    id: 4,
    image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=1920&q=80',
    title: 'Impacto Estudiantil',
    subtitle: 'Calcula y reduce tu huella de carbono como estudiante',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  {
    id: 5,
    image: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=1920&q=80',
    title: 'Futuro Sostenible',
    subtitle: 'Forma parte del cambio hacia un mundo más verde',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
];

export default function UniversityCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);

  useEffect(() => {
    if (!isAutoPlaying) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % universitySlides.length);
    }, 6000); // Cambia cada 6 segundos

    return () => clearInterval(interval);
  }, [isAutoPlaying]);

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 12000);
  };

  const goToPrevious = () => {
    setCurrentSlide((prev) => (prev - 1 + universitySlides.length) % universitySlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 12000);
  };

  const goToNext = () => {
    setCurrentSlide((prev) => (prev + 1) % universitySlides.length);
    setIsAutoPlaying(false);
    setTimeout(() => setIsAutoPlaying(true), 12000);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {/* Slides */}
      {universitySlides.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
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
                <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-3 sm:mb-4 animate-fade-in">
                  {slide.title}
                </h1>
                <p className="text-base sm:text-lg md:text-xl lg:text-2xl mb-6 sm:mb-8 text-gray-100 animate-fade-in-delay">
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
        className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 sm:p-3 rounded-full transition-all z-10 backdrop-blur-sm shadow-lg"
        aria-label="Slide anterior"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <button
        onClick={goToNext}
        className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-2 sm:p-3 rounded-full transition-all z-10 backdrop-blur-sm shadow-lg"
        aria-label="Slide siguiente"
      >
        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Dots Indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex space-x-2 sm:space-x-3 z-10">
        {universitySlides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`h-2 sm:h-3 rounded-full transition-all duration-300 ${
              index === currentSlide
                ? 'w-8 sm:w-12 bg-white shadow-lg'
                : 'w-2 sm:w-3 bg-white/50 hover:bg-white/75'
            }`}
            aria-label={`Ir al slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
}

