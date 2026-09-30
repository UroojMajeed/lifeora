// Palette inspired by the book cover: sky blue + clock-hand orange on deep navy.
export const colors = {
  primary: '#00A9E0',
  primaryDark: '#0077A8',
  primarySoft: '#E3F5FC',
  accent: '#F26522',
  accentSoft: '#FDEBE2',
  navy: '#0B2545',
  background: '#F5FAFD',
  surface: '#FFFFFF',
  text: '#0B2545',
  muted: '#5B6B7F',
  border: '#D9E6EF',
  error: '#D64545',
  success: '#2E9E6A',
  white: '#FFFFFF',
};

export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32, xxl: 48 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const type = {
  hero: { fontSize: 34, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  subtitle: { fontSize: 16, lineHeight: 23, color: colors.muted },
  label: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 0.6, textTransform: 'uppercase' },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
};
