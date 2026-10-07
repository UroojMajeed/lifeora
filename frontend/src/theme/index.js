// Lifeora design tokens ("The Opening"). Calm evergreen and teal, soft aqua backgrounds,
// and Warm Apricot as the spark of reclaimed time: shapes only, never text on light.

export const brand = {
  evergreen: '#123C3A', // main brand, headers, icon background
  teal: '#1E7770', // primary actions (white text: 5.3:1)
  mint: '#BFE9D8', // positive states, highlights
  aqua: '#E8F7F3', // app background, calm cards
  apricot: '#F5B971', // the spark: shapes only, under 3% of the UI
  offWhite: '#F8FAF8', // main surface
  ink: '#172322', // text
  white: '#FFFFFF',
};

export const lightColors = {
  background: brand.offWhite,
  surface: '#FFFFFF',
  surfaceAlt: brand.aqua, // calm cards, chips, inputs
  text: brand.ink,
  muted: '#4F6662',
  border: '#DCEAE5',

  primary: brand.teal, // buttons, selections, progress
  primaryDark: brand.evergreen, // brand text, links and icons on light
  primarySoft: brand.aqua,
  accent: brand.apricot, // shapes only (dots, icons, glows), never text on light
  accentSoft: '#FDF1E0',
  accentText: '#9A5B12', // when an apricot-family label must be text, this reads on light

  // DRIP quadrants and status
  success: brand.teal, // Production
  successSoft: brand.mint,
  warm: '#A8601A', // Replacement (deep apricot so it can be text)
  warmSoft: '#FCEBD3',
  info: '#2F6A8A', // Investment
  infoSoft: '#DCECF4',
  error: '#B3463D', // Delegation
  errorSoft: '#F7E2DF',

  white: '#FFFFFF',
  onColor: '#FFFFFF', // text on a solid color (buttons, badges)

  // Hero cards (Buyback Rate, insights): evergreen into teal
  heroFrom: brand.evergreen,
  heroTo: brand.teal,
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.82)',
  heroFaint: 'rgba(255,255,255,0.62)',
  heroDivider: 'rgba(255,255,255,0.18)',
  heroChip: 'rgba(255,255,255,0.14)',

  shadow: brand.evergreen,

  // A day in one wash (tinted screens): morning yellow → clear sky → evening blue, kept pastel for text
  dayGradient: ['#FFF3D1', '#FBF6EC', '#E4EFFA', '#CFDDF3'],

  // Landing page: aqua mist with a mint glow and a small apricot spark
  landing: [brand.aqua, brand.offWhite, '#DDF2EA'],
  glowA: 'rgba(191,233,216,0.75)',
  glowB: 'rgba(245,185,113,0.16)',
};

export const darkColors = {
  background: '#0A1716',
  surface: '#112423',
  surfaceAlt: '#173230',
  text: '#E8F7F3',
  muted: '#9BB6B0',
  border: '#21403D',

  primary: '#3FB3A6',
  primaryDark: brand.mint,
  primarySoft: 'rgba(63,179,166,0.16)',
  accent: brand.apricot,
  accentSoft: 'rgba(245,185,113,0.14)',
  accentText: brand.apricot, // apricot text is fine on dark

  success: '#5FD3B8',
  successSoft: 'rgba(95,211,184,0.14)',
  warm: brand.apricot,
  warmSoft: 'rgba(245,185,113,0.14)',
  info: '#7FB8DA',
  infoSoft: 'rgba(127,184,218,0.14)',
  error: '#EF8C82',
  errorSoft: 'rgba(239,140,130,0.14)',

  white: '#FFFFFF',
  onColor: '#06201E',

  heroFrom: brand.evergreen,
  heroTo: '#1A5A55',
  heroText: '#FFFFFF',
  heroMuted: 'rgba(255,255,255,0.8)',
  heroFaint: 'rgba(255,255,255,0.6)',
  heroDivider: 'rgba(255,255,255,0.16)',
  heroChip: 'rgba(255,255,255,0.12)',

  shadow: '#000000',

  // Dark: first light → deep sky → night
  dayGradient: ['#2B2414', '#17202B', '#0F1A2B', '#0A1220'],
  landing: ['#0A1716', '#0E2120', brand.evergreen],
  glowA: 'rgba(63,179,166,0.22)',
  glowB: 'rgba(245,185,113,0.12)',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };

/** Soft card shadow in light mode; dark mode relies on borders instead. */
export function cardShadow(colors, isDark) {
  if (isDark) return {};
  return {
    shadowColor: colors.shadow,
    shadowOpacity: 0.07,
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

/** A theme color with transparency, e.g. withAlpha('#F8FAF8', 0.6) → 'rgba(248,250,248,0.6)'. */
export function withAlpha(hex, alpha) {
  const n = parseInt(hex.replace('#', ''), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
