// Design tokens for landing page
export const tokens = {
  spacing: {
    section: 'py-24 md:py-32',
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
  },
  radius: {
    sm: 'rounded-md',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    pill: 'rounded-full',
  },
  animation: {
    staggerDelay: 100, // ms between staggered elements
    duration: {
      fast: 'duration-200',
      normal: 'duration-300',
      slow: 'duration-500',
    },
    easing: 'ease-out',
  },
} as const;

// CSS custom properties for colors (used in globals.css)
export const landingColors = {
  bg: {
    primary: '#0a0a0f',
    secondary: '#111116',
    card: '#16161d',
    cardHover: '#1c1c24',
  },
  text: {
    primary: '#fafafa',
    secondary: '#a1a1aa',
    muted: '#71717a',
  },
  accent: {
    primary: '#6366f1',
    secondary: '#8b5cf6',
    glow: 'rgba(99, 102, 241, 0.15)',
  },
  border: {
    default: 'rgba(255,255,255,0.08)',
    hover: 'rgba(255,255,255,0.15)',
  },
} as const;
