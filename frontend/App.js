import { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import * as Updates from 'expo-updates';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { HandoffsProvider } from './src/context/HandoffsContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { FONT_FILES, fontFamilyFor } from './src/theme/fonts';
import AppNavigator from './src/navigation/AppNavigator';

// Keep the splash screen up until the brand font is ready (so text never flashes in the system font)
// and the update check is done.
SplashScreen.preventAutoHideAsync().catch(() => {});

// On open, a newer update (published with EAS Update) is fetched and started right away, behind the
// splash, instead of only on the next open. A slow connection never blocks: after this long we open
// what we have, and the update applies next time.
const UPDATE_WAIT_MS = 8000;

/** True once the update check is done (or skipped: development, or updates switched off). */
function useLatestUpdate() {
  const [checked, setChecked] = useState(__DEV__ || !Updates.isEnabled);
  useEffect(() => {
    if (checked) return undefined;
    let gaveUp = false;
    const timer = setTimeout(() => {
      gaveUp = true;
      setChecked(true);
    }, UPDATE_WAIT_MS);
    (async () => {
      try {
        const { isAvailable } = await Updates.checkForUpdateAsync();
        if (isAvailable) {
          await Updates.fetchUpdateAsync();
          // Only restart if the app hasn't opened yet (never yank a screen someone is using).
          if (!gaveUp) {
            await Updates.reloadAsync();
            return;
          }
        }
      } catch {
        // Offline or the update server is unreachable: just open.
      }
      clearTimeout(timer);
      setChecked(true);
    })();
    return () => clearTimeout(timer);
  }, [checked]);
  return checked;
}

const navFonts = {
  regular: { fontFamily: fontFamilyFor('400'), fontWeight: 'normal' },
  medium: { fontFamily: fontFamilyFor('500'), fontWeight: 'normal' },
  bold: { fontFamily: fontFamilyFor('700'), fontWeight: 'normal' },
  heavy: { fontFamily: fontFamilyFor('800'), fontWeight: 'normal' },
};

function ThemedApp() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;

  // The window behind the app (visible under Android's navigation bar) matches the screen, not the splash.
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);
  const navTheme = {
    ...base,
    fonts: navFonts,
    colors: { ...base.colors, background: colors.background, card: colors.surface, text: colors.text, border: colors.border, primary: colors.primary },
  };

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <AppNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_FILES);
  const updateChecked = useLatestUpdate();
  // If the font ever fails, still open with the system font.
  const ready = (fontsLoaded || Boolean(fontError)) && updateChecked;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <OnboardingProvider>
            <HandoffsProvider>
              <ThemedApp />
            </HandoffsProvider>
          </OnboardingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
