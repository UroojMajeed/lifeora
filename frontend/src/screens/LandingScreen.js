import { useEffect, useRef } from 'react';
import { ActivityIndicator, Animated, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedLogo from '../components/AnimatedLogo';
import Wordmark from '../components/Wordmark';
import { useOnboarding } from '../context/OnboardingContext';
import { resetTo } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

const MIN_SPLASH_MS = 1400;

// New here (or reopening before step 1 is done): the journey comes first, and "Let's start" there
// begins. Anything further along resumes where it was.
const JOURNEY = { index: 0, routes: [{ name: 'Journey' }] };
const routeFor = (next) => (!next || next === 'BuybackRate' ? JOURNEY : resetTo(next));

/** The splash: the logo while the app loads, then straight on (the journey, or where you left off). */
export default function LandingScreen({ navigation }) {
  const { bootstrap } = useOnboarding();
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    (async () => {
      const [next] = await Promise.all([bootstrap(), new Promise((r) => setTimeout(r, MIN_SPLASH_MS))]);
      if (!cancelled) navigation.reset(routeFor(next));
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrap, navigation, logoScale, logoOpacity]);

  return (
    <LinearGradient colors={colors.landing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      {/* Soft color glows behind the content */}
      <View style={[styles.glow, styles.glowTop]} pointerEvents="none" />
      <View style={[styles.glow, styles.glowBottom]} pointerEvents="none" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.center}>
          <Animated.View style={[styles.logoShadow, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <AnimatedLogo size={128} />
          </Animated.View>
          <Animated.View style={[styles.brand, { opacity: logoOpacity }]}>
            <Wordmark height={52} color={colors.text} />
            <Text style={styles.tagline}>Buy back your time.</Text>
          </Animated.View>
        </View>
        <View style={styles.bottom}>
          <ActivityIndicator color={colors.primary} />
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const makeStyles = (colors, isDark) => ({
  fill: { flex: 1 },
  glow: { position: 'absolute', width: 340, height: 340, borderRadius: 170 },
  glowTop: { top: -90, right: -110, backgroundColor: colors.glowA },
  glowBottom: { bottom: 80, left: -150, backgroundColor: colors.glowB },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  logoShadow: {
    shadowColor: brand.teal,
    shadowOpacity: isDark ? 0.5 : 0.35,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 12 },
    borderRadius: 28,
  },
  brand: { alignItems: 'center', marginTop: spacing.lg },
  tagline: { fontSize: 18, fontWeight: '600', color: colors.primary, marginTop: spacing.sm },
  bottom: { height: 96, alignItems: 'center', justifyContent: 'center' },
});
