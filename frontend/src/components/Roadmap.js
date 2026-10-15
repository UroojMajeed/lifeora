import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

// The journey as a simple flow: one short action per stop, walking down the road to your time back.
// The book's journey in four steps (each pill reads "Step 1" over its name).
const STOPS = [
  { icon: 'cash', label: 'Know your worth' },
  { icon: 'pulse', label: 'Time and energy audit' },
  { icon: 'hand-left', label: 'Delegation' },
  { icon: 'trending-up', label: 'Reinvest' },
];
const DESTINATION = { title: 'Your time back', line: 'for the work and life you love' };

const PILL = 46; // a step: one pill, "STEP 1 │ name" with its icon at the end
const ICON = 36;
const SUN = 52;
const GLOW = SUN + 24;
const ROAD_MAX = 56; // the longest a stretch of road gets on tall screens
const ROAD_MIN = 10;
// One stop at a time, calm: each fades in and lights up, then the road runs on to the next.
const STOP_MS = 1200;
const END_MS = 1400; // the sun, then the promise
const TOTAL_MS = STOPS.length * STOP_MS + END_MS;

const between = (v, a, b) => {
  'worklet';
  return Math.min(1, Math.max(0, (v - a) / (b - a)));
};
// This stop's own 0 → 1 progress within the whole run.
const local = (t, i) => {
  'worklet';
  return between(t * TOTAL_MS, i * STOP_MS, (i + 1) * STOP_MS);
};
// The ending's own 0 → 1 progress, from a to b (fractions of END_MS) after the last stop.
const ending = (t, a, b) => {
  'worklet';
  const start = STOPS.length * STOP_MS;
  return between(t * TOTAL_MS, start + a * END_MS, start + b * END_MS);
};

function Stop({ t, i, stop, done }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  // The stop and its label fade in together…
  const appear = useAnimatedStyle(() => {
    const p = between(local(t.value, i), 0, 0.35);
    return { opacity: p, transform: [{ translateY: 6 * (1 - p) }] };
  });
  // …it lights up…
  const lit = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0.3, 0.55) }));
  // …and the road runs down to the next stop (the last one runs to the sun).
  const drawn = useAnimatedStyle(() => ({ height: `${100 * between(local(t.value, i), 0.6, 1)}%` }));

  return (
    <View style={styles.stop}>
      {/* One line, read left to right: "STEP 1 │ Know your worth", the icon lighting up at the end. */}
      <Animated.View style={[styles.pill, done ? null : appear]}>
        <Text style={styles.step}>Step {i + 1}</Text>
        <View style={styles.divider} />
        <Text style={styles.label} numberOfLines={1}>
          {stop.label}
        </Text>
        <View style={styles.icon}>
          <Ionicons name={stop.icon} size={16} color={colors.primary} />
          <Animated.View style={[styles.iconLit, done ? null : lit]}>
            <Ionicons name={stop.icon} size={16} color={colors.onColor} />
          </Animated.View>
        </View>
      </Animated.View>
      <View style={styles.road}>
        <Animated.View style={[styles.roadDrawn, done ? styles.roadFull : drawn]} />
      </View>
    </View>
  );
}

/**
 * The journey screen's road map, centred: the book's four steps down the middle, each one pill with
 * its icon, "Step N" and its name (Know your worth → Time and energy audit → Delegation → Reinvest),
 * joined by the road, ending at the sun and the promise: "Your time back, for the work and life you
 * love". The road stretches to fill the screen. Plays once, one stop
 * at a time; shown complete when reduce-motion is on, and for sure once the run is over.
 */
export default function Roadmap() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const t = useSharedValue(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) {
        t.value = 1;
        setDone(true);
      } else {
        t.value = withDelay(
          300,
          withTiming(1, { duration: TOTAL_MS, easing: Easing.linear }, (finished) => {
            if (finished) runOnJS(setDone)(true);
          })
        );
      }
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const sun = useAnimatedStyle(() => {
    const p = ending(t.value, 0, 0.45);
    return { opacity: p, transform: [{ scale: 0.85 + 0.15 * p }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 * ending(t.value, 0, 0.45) }));
  const dest = useAnimatedStyle(() => {
    const p = ending(t.value, 0.35, 1);
    return { opacity: p, transform: [{ translateY: 6 * (1 - p) }] };
  });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Your journey: ${STOPS.map((s, i) => `step ${i + 1}, ${s.label}`).join('; ')}. Then: your time back, for the work and life you love.`}
    >
      {STOPS.map((stop, i) => (
        <Stop key={stop.label} t={t} i={i} stop={stop} done={done} />
      ))}

      {/* The destination: the sun at the end of the road, the promise under it. */}
      <View style={styles.sunWrap}>
        <Animated.View style={[styles.glow, done ? styles.glowDone : glow]} />
        <Animated.View style={[styles.sun, done ? null : sun]}>
          <Ionicons name="sunny" size={26} color={colors.onColor} />
        </Animated.View>
      </View>
      <Animated.View style={[styles.dest, done ? null : dest]}>
        <Text style={styles.destTitle}>{DESTINATION.title}</Text>
        <Text style={styles.destLine}>{DESTINATION.line}</Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors) => ({
  // Fills the room between the heading and the button (no scrolling); the road stretches share it.
  wrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', marginTop: spacing.sm },
  // A step grows only as far as its stretch of road can (so the road always meets the next pill).
  stop: { flex: 1, minHeight: PILL + 4 + ROAD_MIN, maxHeight: PILL + 4 + ROAD_MAX, alignItems: 'center' },
  pill: {
    height: PILL,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingLeft: 16,
    paddingRight: 5,
    borderRadius: PILL / 2,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  icon: {
    width: ICON,
    height: ICON,
    borderRadius: ICON / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  iconLit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  step: { fontSize: 12, fontWeight: '800', color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  divider: { width: 1, height: 18, backgroundColor: colors.border },
  label: { fontSize: 15, fontWeight: '700', color: colors.text },
  // A stretch of road: faint until it's drawn in teal from the top.
  road: { flex: 1, minHeight: ROAD_MIN, maxHeight: ROAD_MAX, width: 4, borderRadius: 2, marginVertical: 2, backgroundColor: colors.border, overflow: 'hidden' },
  roadDrawn: { width: 4, borderRadius: 2, backgroundColor: colors.primary },
  roadFull: { height: '100%' },
  sunWrap: { alignItems: 'center', justifyContent: 'center', width: GLOW, height: GLOW },
  glow: { position: 'absolute', width: GLOW, height: GLOW, borderRadius: GLOW / 2, backgroundColor: brand.apricot },
  glowDone: { opacity: 0.35 },
  sun: { width: SUN, height: SUN, borderRadius: SUN / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  dest: { alignItems: 'center', marginTop: 4 },
  // The payoff reads as one statement: a big headline, then who it's for, warm like the sun.
  destTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  destLine: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.accentText, textAlign: 'center' },
});
