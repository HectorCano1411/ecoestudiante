'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Mission } from '@/types/gamification';

interface MissionCompletedCelebrationProps {
  mission: Mission | null;
  xpEarned: number;
  onClose: () => void;
}

export default function MissionCompletedCelebration({
  mission,
  xpEarned,
  onClose
}: MissionCompletedCelebrationProps) {
  const [showContent, setShowContent] = useState(false);
  const confettiRef = useRef<any>(null);

  useEffect(() => {
    if (mission) {
      // Trigger confetti
      fireConfetti();

      // Show content after a slight delay for dramatic effect
      setTimeout(() => setShowContent(true), 300);

      // Auto-close after 6 seconds
      const timer = setTimeout(() => {
        handleClose();
      }, 6000);

      return () => {
        clearTimeout(timer);
        if (confettiRef.current) {
          confettiRef.current = null;
        }
      };
    }
  }, [mission]);

  const fireConfetti = async () => {
    try {
      // Dynamically import canvas-confetti
      const confetti = (await import('canvas-confetti')).default;

      const duration = 3000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);

        // Fire confetti from both sides
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      confettiRef.current = interval;
    } catch (error) {
      console.log('Confetti not available:', error);
    }
  };

  const handleClose = () => {
    setShowContent(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  if (!mission) return null;

  const categoryEmoji = {
    ELECTRICITY: '\u26A1',
    TRANSPORT: '\u{1F68C}',
    WASTE: '\u{1F5D1}',
    GENERAL: '\u{1F331}',
    BONUS: '\u2B50'
  }[mission.category] || '\u{1F3C6}';

  return (
    <AnimatePresence>
      {showContent && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          {/* Overlay */}
          <motion.div
            className="absolute inset-0 bg-black/50"
            onClick={handleClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Modal Content */}
          <motion.div
            className="relative w-full max-w-md bg-gradient-to-br from-yellow-50 via-white to-green-50 rounded-3xl shadow-2xl overflow-hidden"
            initial={{ scale: 0.5, rotate: -10, opacity: 0 }}
            animate={{
              scale: 1,
              rotate: 0,
              opacity: 1,
              transition: {
                type: "spring",
                stiffness: 300,
                damping: 20
              }
            }}
            exit={{ scale: 0.8, opacity: 0 }}
          >
            {/* Glow effect */}
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/30 via-transparent to-green-200/30 animate-pulse" />

            {/* Content */}
            <div className="relative p-8 text-center">
              {/* Trophy/Medal animation */}
              <motion.div
                className="mb-6"
                initial={{ scale: 0, rotate: -180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  transition: {
                    type: "spring",
                    stiffness: 200,
                    damping: 15,
                    delay: 0.2
                  }
                }}
              >
                <motion.div
                  className="inline-block text-8xl"
                  animate={{
                    rotate: [0, -10, 10, -10, 10, 0],
                    scale: [1, 1.1, 1, 1.1, 1]
                  }}
                  transition={{
                    duration: 0.8,
                    repeat: Infinity,
                    repeatDelay: 2
                  }}
                >
                  {'\u{1F3C6}'}
                </motion.div>
              </motion.div>

              {/* Title */}
              <motion.h2
                className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-green-600 to-blue-600 mb-3"
                initial={{ y: 20, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: { delay: 0.3 }
                }}
              >
                {'\u00A1'}MISI{'\u00D3'}N COMPLETADA!
              </motion.h2>

              {/* Mission Title */}
              <motion.div
                className="mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: { delay: 0.4 }
                }}
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-4xl">{mission.iconEmoji || categoryEmoji}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">
                  {mission.title}
                </h3>
              </motion.div>

              {/* XP Earned */}
              <motion.div
                className="mb-6 p-6 bg-gradient-to-r from-green-100 to-blue-100 rounded-2xl border-2 border-green-300"
                initial={{ scale: 0, rotate: 180 }}
                animate={{
                  scale: 1,
                  rotate: 0,
                  transition: {
                    delay: 0.5,
                    type: "spring",
                    stiffness: 200
                  }
                }}
              >
                <p className="text-sm font-semibold text-gray-600 mb-1">
                  XP GANADO
                </p>
                <motion.p
                  className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-blue-600"
                  initial={{ scale: 0 }}
                  animate={{
                    scale: [0, 1.3, 1],
                    transition: { delay: 0.6, duration: 0.5 }
                  }}
                >
                  +{xpEarned}
                </motion.p>
              </motion.div>

              {/* Stars animation */}
              <motion.div
                className="flex justify-center gap-2 mb-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.7 } }}
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="text-4xl"
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{
                      scale: 1,
                      rotate: 0,
                      transition: {
                        delay: 0.7 + i * 0.1,
                        type: "spring",
                        stiffness: 300
                      }
                    }}
                  >
                    {'\u2B50'}
                  </motion.span>
                ))}
              </motion.div>

              {/* Message */}
              <motion.p
                className="text-gray-700 font-medium mb-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: { delay: 0.8 }
                }}
              >
                {'\u00A1'}Excelente trabajo! Contin{'\u00FA'}a as{'\u00ED'} para alcanzar tus metas {'\u{1F331}'}
              </motion.p>

              {/* Close button */}
              <motion.button
                onClick={handleClose}
                className="px-8 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all transform hover:scale-105"
                initial={{ y: 20, opacity: 0 }}
                animate={{
                  y: 0,
                  opacity: 1,
                  transition: { delay: 0.9 }
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                {'\u00A1'}Genial! {'\u{1F389}'}
              </motion.button>
            </div>

            {/* Decorative particles */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[...Array(20)].map((_, i) => (
                <motion.div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                  }}
                  animate={{
                    y: [0, -30, 0],
                    opacity: [0, 1, 0],
                    scale: [0, 1, 0]
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    delay: Math.random() * 2,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
