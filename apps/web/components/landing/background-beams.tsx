'use client';

import { useEffect, useRef } from 'react';

export function BackgroundBeams({ className = '' }: { className?: string }) {
  const beamsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || !beamsRef.current) return;

    // Subtle mouse-follow effect
    const handleMouseMove = (e: MouseEvent) => {
      if (!beamsRef.current) return;
      const rect = beamsRef.current.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      beamsRef.current.style.setProperty('--mouse-x', `${x}%`);
      beamsRef.current.style.setProperty('--mouse-y', `${y}%`);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div
      ref={beamsRef}
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
      style={{
        '--mouse-x': '50%',
        '--mouse-y': '50%',
      } as React.CSSProperties}
      aria-hidden="true"
    >
      {/* Primary radial gradient beam */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: `
            radial-gradient(
              ellipse 80% 50% at var(--mouse-x, 50%) var(--mouse-y, 30%),
              rgba(99, 102, 241, 0.15) 0%,
              transparent 50%
            )
          `,
        }}
      />

      {/* Secondary purple beam */}
      <div
        className="absolute inset-0 opacity-20 animate-glow-pulse"
        style={{
          background: `
            radial-gradient(
              ellipse 60% 40% at 70% 20%,
              rgba(139, 92, 246, 0.2) 0%,
              transparent 50%
            )
          `,
        }}
      />

      {/* Tertiary accent beam */}
      <div
        className="absolute inset-0 opacity-15"
        style={{
          background: `
            radial-gradient(
              ellipse 40% 60% at 20% 60%,
              rgba(99, 102, 241, 0.1) 0%,
              transparent 40%
            )
          `,
        }}
      />
    </div>
  );
}
