import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { StyleSheet, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkColors, lightColors, makeType } from './index';

import { withFonts } from './fonts';

// Dark mode is hidden for now: the app always uses the light colours, and the ☀/🌙 button is gone.
// Set to true to bring both back.
export const DARK_MODE = false;

const MODE_KEY = 'lifeora.themeMode';
const MODES = ['system', 'light', 'dark'];

const ThemeContext = createContext(null);

/** Light/dark theme. Follows the phone by default; the user can pin light or dark. */
export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState('system');

  useEffect(() => {
    AsyncStorage.getItem(MODE_KEY)
      .then((saved) => MODES.includes(saved) && setModeState(saved))
      .catch(() => {});
  }, []);

  const setMode = useCallback((next) => {
    setModeState(next);
    AsyncStorage.setItem(MODE_KEY, next).catch(() => {});
  }, []);

  const isDark = DARK_MODE && (mode === 'dark' || (mode === 'system' && systemScheme === 'dark'));

  // The ☀️/🌙 button: flips to the opposite of what's on screen and pins it.
  const toggle = useCallback(() => setMode(isDark ? 'light' : 'dark'), [isDark, setMode]);

  const value = useMemo(() => {
    const colors = isDark ? darkColors : lightColors;
    return { colors, type: withFonts(makeType(colors)), isDark, mode, setMode, toggle };
  }, [isDark, mode, setMode, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}

/** Builds a StyleSheet from the current theme: `const styles = useStyles(makeStyles)`. */
export function useStyles(makeStyles) {
  const theme = useTheme();
  return useMemo(() => StyleSheet.create(withFonts(makeStyles(theme.colors, theme.isDark))), [makeStyles, theme]);
}
