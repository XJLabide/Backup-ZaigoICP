'use client';

import { useState, useEffect, Children, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface CardSwapProps {
  children: ReactNode;
  cardDistance?: number;
  verticalDistance?: number;
  delay?: number;
  pauseOnHover?: boolean;
}

export function Card({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white border border-neutral-200 rounded-2xl shadow-lg shadow-black/5 p-6">
      {children}
    </div>
  );
}

export default function CardSwap({
  children,
  cardDistance = 60,
  verticalDistance = 70,
  delay = 5000,
  pauseOnHover = false,
}: CardSwapProps) {
  const childArray = Children.toArray(children);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused && pauseOnHover) return;
    if (childArray.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % childArray.length);
    }, delay);

    return () => clearInterval(interval);
  }, [delay, childArray.length, isPaused, pauseOnHover]);

  const handleMouseEnter = () => {
    if (pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (pauseOnHover) {
      setIsPaused(false);
    }
  };

  return (
    <div
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        height: `calc(100% + ${verticalDistance * (childArray.length - 1)}px)`,
      }}
    >
      <AnimatePresence initial={false}>
        {childArray.map((child, index) => {
          const position = (index - currentIndex + childArray.length) % childArray.length;
          const isBack = position === childArray.length - 1;

          return (
            <motion.div
              key={`card-${index}`}
              className="absolute top-0 left-0 w-full"
              initial={
                isBack
                  ? {
                      x: -cardDistance * position,
                      y: verticalDistance * position,
                      scale: 1 - position * 0.05,
                      opacity: 0.6,
                      zIndex: -position,
                    }
                  : undefined
              }
              animate={{
                x: -cardDistance * position,
                y: verticalDistance * position,
                scale: 1 - position * 0.05,
                opacity: position === 0 ? 1 : 0.6,
                zIndex: childArray.length - position,
              }}
              transition={{
                duration: 0.6,
                ease: [0.34, 1.56, 0.64, 1],
              }}
            >
              {child}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
