import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AnimatedLogo from '../components/AnimatedLogo';
import Roadmap from '../components/Roadmap';
import Wordmark from '../components/Wordmark';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import { useOnboarding } from '../context/OnboardingContext';
import { resetTo } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

const MIN_SPLASH_MS = 1400;

const PERKS = [
  { icon: 'timer-outline', label: '1-minute setup' },
  { icon: 'person-outline', label: 'No sign-up' },
  { icon: 'gift-outline', label: 'Free' },
];

export default function LandingScreen({ navigation }) {
  const { bootstrap, startAsGuest } = useOnboarding();
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [ready, setReady] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;
  const ctaRise = useRef(new Animated.Value(16)).current;

  const getStarted = async () => {
    setError('');
    setStarting(true);
    try {
      const next = await startAsGuest();
      navigation.reset(resetTo(next));
    } catch (err) {
      setError(err.message);
      setStarting(false);
    }
  };

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    (async () => {
      const [next] = await Promise.all([bootstrap(), new Promise((r) => setTimeout(r, MIN_SPLASH_MS))]);
      if (cancelled) return;
      if (next) {
        navigation.reset(resetTo(next));
      } else {
        setReady(true);
        Animated.parallel([
          Animated.timing(ctaOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
          Animated.timing(ctaRise, { toValue: 0, duration: 450, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
        ]).start();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrap, navigation, logoScale, logoOpacity, ctaOpacity, ctaRise]);

  return (
    <LinearGradient colors={colors.landing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill}>
      {/* Soft color glows behind the content */}
      <View style={[styles.glow, styles.glowTop]} pointerEvents="none" />
      <View style={[styles.glow, styles.glowBottom]} pointerEvents="none" />

      <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <View style={styles.topBar}>
          <ThemeToggle />
        </View>

        <View style={styles.center}>
          <Animated.View style={[styles.logoShadow, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
            <AnimatedLogo size={96} />
          </Animated.View>
          <Animated.View style={[styles.brand, { opacity: logoOpacity }]}>
            <Wordmark height={44} color={colors.text} />
            <Text style={styles.tagline}>Buy back your time.</Text>
          </Animated.View>

          {/* The promise: the pain in one line, then a road map of what the next two minutes give you. */}
          {ready ? (
            <Animated.View style={[styles.promise, { opacity: ctaOpacity }]}>
              <Text style={styles.punch}>You didn't start a business to drown in busywork.</Text>
              <Roadmap />
            </Animated.View>
          ) : null}
        </View>

        <View style={styles.bottom}>
          {ready ? (
            <Animated.View style={[styles.ctas, { opacity: ctaOpacity, transform: [{ translateY: ctaRise }] }]}>
              <View style={styles.perks}>
                {PERKS.map((p) => (
                  <View key={p.label} style={styles.perk}>
                    <Ionicons name={p.icon} size={14} color={colors.primaryDark} />
                    <Text style={styles.perkText}>{p.label}</Text>
                  </View>
                ))}
              </View>
              <Button title="Get started" icon="arrow-forward" onPress={getStarted} loading={starting} />
              {error ? <Text style={styles.error}>{error}</Text> : null}
              <Pressable
                onPress={() => navigation.navigate('Account', { mode: 'signin' })}
                disabled={starting}
                accessibilityRole="button"
                hitSlop={8}
                style={({ pressed }) => [styles.signIn, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.signInText}>
                  I already have an account. <Text style={styles.signInLink}>Sign in</Text>
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <ActivityIndicator color={colors.primary} />
          )}
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
  topBar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
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
  bottom: { minHeight: 170, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  ctas: { gap: spacing.md },
  promise: { alignSelf: 'stretch', paddingHorizontal: spacing.lg, marginTop: spacing.xl },
  punch: { fontSize: 20, lineHeight: 27, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  perks: { flexDirection: 'row', justifyContent: 'center', flexWrap: 'wrap', gap: spacing.sm },
  perk: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.75)',
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'rgba(255,255,255,0.9)',
  },
  perkText: { fontSize: 13, fontWeight: '600', color: colors.text },
  error: { color: colors.error, fontSize: 14, lineHeight: 20, textAlign: 'center' },
  signIn: { alignItems: 'center', paddingVertical: spacing.xs },
  signInText: { fontSize: 14, color: colors.muted },
  signInLink: { color: colors.primaryDark, fontWeight: '700' },
});
