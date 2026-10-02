import { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DarkTheme, DefaultTheme, NavigationContainer } from '@react-navigation/native';
import { OnboardingProvider } from './src/context/OnboardingContext';
import { ThemeProvider, useTheme } from './src/theme/ThemeContext';
import { FONT_FILES, fontFamilyFor } from './src/theme/fonts';
import AppNavigator from './src/navigation/AppNavigator';

// Keep the splash screen up until the brand font is ready, so text never flashes in the system font.
SplashScreen.preventAutoHideAsync().catch(() => {});

const navFonts = {
  regular: { fontFamily: fontFamilyFor('400'), fontWeight: 'normal' },
  medium: { fontFamily: fontFamilyFor('500'), fontWeight: 'normal' },
  bold: { fontFamily: fontFamilyFor('700'), fontWeight: 'normal' },
  heavy: { fontFamily: fontFamilyFor('800'), fontWeight: 'normal' },
};

function ThemedApp() {
  const { colors, isDark } = useTheme();
  const base = isDark ? DarkTheme : DefaultTheme;
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
  const ready = fontsLoaded || Boolean(fontError); // if the font ever fails, still open with the system font

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <OnboardingProvider>
            <ThemedApp />
          </OnboardingProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
