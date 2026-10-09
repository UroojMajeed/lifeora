import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

// The journey as a simple flow: one short action per stop, walking down the road to your time back.
const STOPS = [
  { icon: 'cash', label: "Know your hour's worth" },
  { icon: 'list', label: 'Map your routine' },
  { icon: 'pie-chart', label: 'See what drains you' },
  { icon: 'hand-left', label: 'Hand it off' },
];
const DESTINATION = { title: 'Your time back', line: 'for the work and life you love' };
// What the time is for: concrete pictures motivate more than the word "time".
const FOR = [
  { icon: 'heart', label: 'Family' },
  { icon: 'fitness', label: 'Health' },
  { icon: 'rocket', label: 'Growth' },
];

const NODE = 44;
const SUN = 56;
const STOP_H = NODE + 6 + 21; // a node, then its label under it
const ROAD_MAX = 64; // the longest a stretch of road gets on tall screens
const ROAD_MIN = 14;
const DEST_H = SUN + 28 + 8 + 30 + 22 + 10 + 30; // the sun (with its glow), the promise and the chips
// The smallest the map gets (small phones scroll rather than squash it).
const MIN_H = STOPS.length * (STOP_H + 8 + ROAD_MIN) + DEST_H;
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
      <Animated.View style={[styles.stopHead, done ? null : appear]}>
        <View style={styles.node}>
          <Animated.View style={[styles.nodeLit, done ? null : lit]}>
            <Ionicons name={stop.icon} size={20} color={colors.onColor} />
          </Animated.View>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {stop.label}
        </Text>
      </Animated.View>
      <View style={styles.road}>
        <Animated.View style={[styles.roadDrawn, done ? styles.roadFull : drawn]} />
      </View>
    </View>
  );
}

/**
 * The journey screen's road map, centred: four stops down the middle, each an icon with one short
 * action under it ("Know your hour's worth" → "Map your routine" → "See what drains you" → "Hand
 * it off"), joined by the road, ending at the sun and the promise: "Your time back, for the work
 * and life you love", and what it's for. The road stretches to fill the screen. Plays once, one stop
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
      accessibilityLabel={`Your journey: ${STOPS.map((s) => s.label).join(', then ')}. Then: your time back, for the work and life you love: family, health, growth.`}
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
        <View style={styles.forRow}>
          {FOR.map((f) => (
            <View key={f.label} style={styles.forChip}>
              <Ionicons name={f.icon} size={13} color={colors.accentText} />
              <Text style={styles.forText}>{f.label}</Text>
            </View>
          ))}
        </View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors) => ({
  // Fills the room between the heading and the button; the road stretches share it equally.
  wrap: { flex: 1, alignSelf: 'stretch', alignItems: 'center', justifyContent: 'center', minHeight: MIN_H, marginTop: spacing.md },
  // A stop grows only as far as its stretch of road can (so the road always meets the next icon).
  stop: { flex: 1, minHeight: STOP_H + 8 + ROAD_MIN, maxHeight: STOP_H + 8 + ROAD_MAX, alignItems: 'center' },
  stopHead: { alignItems: 'center', height: STOP_H },
  label: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.text, marginTop: 6, textAlign: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  nodeLit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  // A stretch of road: faint until it's drawn in teal from the top.
  road: { flex: 1, minHeight: ROAD_MIN, maxHeight: ROAD_MAX, width: 4, borderRadius: 2, marginVertical: 4, backgroundColor: colors.border, overflow: 'hidden' },
  roadDrawn: { width: 4, borderRadius: 2, backgroundColor: colors.primary },
  roadFull: { height: '100%' },
  sunWrap: { alignItems: 'center', justifyContent: 'center', width: SUN + 28, height: SUN + 28 },
  glow: { position: 'absolute', width: SUN + 28, height: SUN + 28, borderRadius: (SUN + 28) / 2, backgroundColor: brand.apricot },
  glowDone: { opacity: 0.35 },
  sun: { width: SUN, height: SUN, borderRadius: SUN / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  dest: { alignItems: 'center', marginTop: 8 },
  // The payoff reads as one statement: a big headline, then who it's for, warm like the sun.
  destTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  destLine: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.accentText, textAlign: 'center' },
  forRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm + 2 },
  forChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldLine,
  },
  forText: { fontSize: 13, fontWeight: '700', color: colors.text },
});
