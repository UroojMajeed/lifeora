import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Logo from '../components/Logo';
import Button from '../components/Button';
import { useOnboarding } from '../context/OnboardingContext';
import { colors, spacing } from '../theme';

const MIN_SPLASH_MS = 1400;

export default function LandingScreen({ navigation }) {
  const { bootstrap } = useOnboarding();
  const [ready, setReady] = useState(false);

  const logoScale = useRef(new Animated.Value(0.6)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const ctaOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, friction: 6, useNativeDriver: true }),
      Animated.timing(logoOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      // One full turn backwards: time being "bought back".
      Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();

    let cancelled = false;
    (async () => {
      const [next] = await Promise.all([bootstrap(), new Promise((r) => setTimeout(r, MIN_SPLASH_MS))]);
      if (cancelled) return;
      if (next) {
        navigation.reset({ index: 0, routes: [{ name: next }] });
      } else {
        setReady(true);
        Animated.timing(ctaOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootstrap, navigation, logoScale, logoOpacity, spin, ctaOpacity]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '-360deg'] });

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style="light" />
      <View style={styles.center}>
        <Animated.View style={{ opacity: logoOpacity, transform: [{ scale: logoScale }, { rotate }] }}>
          <Logo size={148} />
        </Animated.View>
        <Animated.View style={[styles.brand, { opacity: logoOpacity }]}>
          <Text style={styles.name}>Reclaim</Text>
          <Text style={styles.tagline}>Buy back your time.</Text>
        </Animated.View>
      </View>

      <View style={styles.bottom}>
        {ready ? (
          <Animated.View style={[styles.ctas, { opacity: ctaOpacity }]}>
            <Text style={styles.pitch}>
              Stop trading your hours for busywork. Find what drains you, hand it off, and spend your time where it
              matters most.
            </Text>
            <Button title="Get started" onPress={() => navigation.navigate('Welcome')} />
            <Button
              title="I already have an account"
              variant="ghostLight"
              onPress={() => navigation.navigate('Auth', { mode: 'login' })}
            />
          </Animated.View>
        ) : (
          <ActivityIndicator color={colors.white} />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', marginTop: spacing.lg },
  name: { fontSize: 44, fontWeight: '800', color: colors.white, letterSpacing: -1 },
  tagline: { fontSize: 18, fontWeight: '600', color: colors.primary, marginTop: spacing.xs },
  bottom: { minHeight: 220, justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  ctas: { gap: spacing.sm },
  pitch: {
    color: '#C9D6E3',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
