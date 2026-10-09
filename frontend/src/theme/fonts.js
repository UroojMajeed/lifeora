// Brand typeface: Plus Jakarta Sans. Only the weights the UI uses are bundled.
import { PlusJakartaSans_400Regular } from '@expo-google-fonts/plus-jakarta-sans/400Regular';
import { PlusJakartaSans_500Medium } from '@expo-google-fonts/plus-jakarta-sans/500Medium';
import { PlusJakartaSans_600SemiBold } from '@expo-google-fonts/plus-jakarta-sans/600SemiBold';
import { PlusJakartaSans_700Bold } from '@expo-google-fonts/plus-jakarta-sans/700Bold';
import { PlusJakartaSans_800ExtraBold } from '@expo-google-fonts/plus-jakarta-sans/800ExtraBold';

/** Passed to expo-font's useFonts() once at startup. */
export const FONT_FILES = {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
};

const FAMILY_BY_WEIGHT = {
  100: 'PlusJakartaSans_400Regular',
  200: 'PlusJakartaSans_400Regular',
  300: 'PlusJakartaSans_400Regular',
  400: 'PlusJakartaSans_400Regular',
  normal: 'PlusJakartaSans_400Regular',
  500: 'PlusJakartaSans_500Medium',
  600: 'PlusJakartaSans_600SemiBold',
  700: 'PlusJakartaSans_700Bold',
  bold: 'PlusJakartaSans_700Bold',
  800: 'PlusJakartaSans_800ExtraBold',
  900: 'PlusJakartaSans_800ExtraBold',
};

export const fontFamilyFor = (weight = '400') => FAMILY_BY_WEIGHT[weight] || FAMILY_BY_WEIGHT[400];

/**
 * The app's type scale. Text sizes snap to these steps so every screen uses the same few sizes:
 *   28 screen title · 20 section heading · 18 card title · 16 large body · 15 body · 14 secondary
 *   13 small · 12 caption/label · 10 tiny graph labels. Big numbers (24 and up) are left as they are.
 */
const SNAP = { 9: 10, 11: 12, 17: 18, 19: 18, 21: 20, 22: 20, 23: 24 };
export const snapFontSize = (size) => SNAP[size] ?? size;

/**
 * Custom fonts pick their weight by file, not by `fontWeight` (Android ignores fontWeight for them).
 * Any text style (one with fontSize or fontWeight) gets the matching Plus Jakarta Sans file instead,
 * and its size snaps to the type scale above.
 */
export function withFont(style) {
  if (!style || typeof style !== 'object' || style.fontFamily) return style;
  if (!('fontSize' in style) && !('fontWeight' in style)) return style;
  const { fontWeight, ...rest } = style;
  if (typeof rest.fontSize === 'number') rest.fontSize = snapFontSize(rest.fontSize);
  // Android adds extra "font padding" that, with this font, lands above the letters, so labels sat
  // low in buttons and pills. Without it, text centres properly (iOS ignores both settings).
  return { includeFontPadding: false, textAlignVertical: 'center', ...rest, fontFamily: fontFamilyFor(fontWeight) };
}

/** Applies withFont() to every entry of a styles map, e.g. the result of makeStyles(). */
export function withFonts(styles) {
  const out = {};
  Object.keys(styles).forEach((k) => {
    out[k] = withFont(styles[k]);
  });
  return out;
}
