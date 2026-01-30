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

// CSS custom properties for AOG brand colors (used in globals.css)
export const landingColors = {
  bg: {
    primary: '#1a1d29',
    secondary: '#242836',
    card: '#242836',
    cardHover: '#2d3242',
  },
  text: {
    primary: '#ffffff',
    secondary: '#9ca3af',
    muted: '#6b7280',
  },
  accent: {
    primary: '#d4a84b', // gold
    secondary: '#e5b95c', // lighter gold
    teal: '#0ea5e9',
    glow: 'rgba(212, 168, 75, 0.15)',
  },
  border: {
    default: 'rgba(255,255,255,0.1)',
    hover: 'rgba(255,255,255,0.15)',
  },
  success: '#22c55e',
} as const;
