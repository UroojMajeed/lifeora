// Reclaim design tokens. Cool slate neutrals, sky blue + warm orange from the book cover,
// and an indigo → sky gradient for hero surfaces.

// Fixed brand colors (the logo looks the same in both themes).
export const brand = {
  sky: '#0EA5E9',
  indigo: '#6366F1',
  orange: '#FB923C',
  white: '#FFFFFF',
};

export const lightColors = {
  background: '#F6F7FB',
  surface: '#FFFFFF',
  surfaceAlt: '#F0F2F8',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E4E7EF',

  primary: '#0EA5E9',
  primaryDark: '#0369A1',
  primarySoft: '#E0F2FE',
  accent: '#EA580C',
  accentSoft: '#FFEDD5',
  success: '#059669',
  successSoft: '#D1FAE5',
  error: '#E11D48',
  errorSoft: '#FFE4E6',
  violet: '#7C3AED',
  violetSoft: '#EDE9FE',
  white: '#FFFFFF',
  onColor: '#FFFFFF', // text on a solid color (buttons, badges)

  // Hero gradient cards (Buyback Rate, insights) and the landing screen.
  heroFrom: '#1E1B4B',
  heroTo: '#0369A1',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.78)',
  heroFaint: 'rgba(255,255,255,0.58)',
  heroDivider: 'rgba(255,255,255,0.18)',
  heroChip: 'rgba(255,255,255,0.14)',

  shadow: '#0F172A',

  // Landing page
  landing: ['#E0F2FE', '#EEF2FF', '#FFF1E6'],
  glowA: 'rgba(14,165,233,0.22)',
  glowB: 'rgba(124,58,237,0.16)',
};

export const darkColors = {
  background: '#090C17',
  surface: '#121729',
  surfaceAlt: '#1A2035',
  text: '#F1F5F9',
  muted: '#94A3B8',
  border: '#242B44',

  primary: '#38BDF8',
  primaryDark: '#7DD3FC',
  primarySoft: 'rgba(56,189,248,0.14)',
  accent: '#FB923C',
  accentSoft: 'rgba(251,146,60,0.16)',
  success: '#34D399',
  successSoft: 'rgba(52,211,153,0.14)',
  error: '#FB7185',
  errorSoft: 'rgba(251,113,133,0.15)',
  violet: '#A78BFA',
  violetSoft: 'rgba(167,139,250,0.16)',
  white: '#FFFFFF',
  onColor: '#0A0D1A',

  heroFrom: '#1E1B4B',
  heroTo: '#0C4A6E',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.78)',
  heroFaint: 'rgba(255,255,255,0.58)',
  heroDivider: 'rgba(255,255,255,0.16)',
  heroChip: 'rgba(255,255,255,0.12)',

  shadow: '#000000',

  landing: ['#0B1026', '#151238', '#090C17'],
  glowA: 'rgba(56,189,248,0.18)',
  glowB: 'rgba(167,139,250,0.16)',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

/** Soft card shadow in light mode; dark mode relies on borders instead. */
export function cardShadow(colors, isDark) {
  if (isDark) return {};
  return {
    shadowColor: colors.shadow,
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  };
}

export function makeType(colors) {
  return {
    hero: { fontSize: 36, fontWeight: '800', color: colors.text, letterSpacing: -0.8 },
    title: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.6, lineHeight: 34 },
    subtitle: { fontSize: 16, lineHeight: 24, color: colors.muted },
    label: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1, textTransform: 'uppercase' },
    body: { fontSize: 15, lineHeight: 22, color: colors.text },
  };
}
