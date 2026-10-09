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
const COL = SUN; // the road's column: stops and the sun are centred in it
const GAP = 16; // between the road's column and the labels
const SUN_TOP = 6; // the sun's offset in its row (so it lines up with the promise beside it)
const SUN_CENTER = SUN_TOP + SUN / 2;
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

function Stop({ t, i, stop, rowHeight, done }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  // The stop and its label fade in together (the label drifts out from the road)…
  const appear = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0, 0.3) }));
  const label = useAnimatedStyle(() => {
    const p = between(local(t.value, i), 0.05, 0.4);
    return { opacity: p, transform: [{ translateX: -8 * (1 - p) }] };
  });
  // …then it lights up.
  const lit = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0.3, 0.55) }));

  return (
    <View style={[styles.row, { height: rowHeight }]}>
      <Animated.View style={[styles.col, done ? null : appear]}>
        <View style={styles.node}>
          <Animated.View style={[styles.nodeLit, done ? null : lit]}>
            <Ionicons name={stop.icon} size={20} color={colors.onColor} />
          </Animated.View>
        </View>
      </Animated.View>
      <Animated.View style={[styles.labelWrap, done ? null : label]}>
        <Text style={styles.label} numberOfLines={2}>
          {stop.label}
        </Text>
      </Animated.View>
    </View>
  );
}

/**
 * The journey screen's road map, as a vertical stepper: four stops down the left, one short action
 * each ("Know your hour's worth" → "Map your routine" → "See what drains you" → "Hand it off"),
 * ending at the sun with the promise beside it: "Your time back, for the work and life you love",
 * and what it's for. Plays once, one stop at a time; shown complete when reduce-motion is on, and
 * for sure once the run is over.
 */
export default function Roadmap({ height = 320 }) {
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

  const rowHeight = Math.max(56, Math.min(80, (height - 130) / STOPS.length));
  const roadTop = rowHeight / 2; // the first stop's centre
  const lastStretch = rowHeight / 2 + SUN_CENTER; // from the last stop down to the sun's centre
  const roadLength = rowHeight * (STOPS.length - 1) + lastStretch;

  // The road runs on to the next stop once this one has lit up; the last stretch reaches the sun.
  const road = useAnimatedStyle(() => {
    let drawn = 0;
    for (let i = 0; i < STOPS.length; i += 1) {
      const p = between(local(t.value, i), 0.6, 1);
      drawn += p * (i === STOPS.length - 1 ? lastStretch : rowHeight);
    }
    return { height: drawn };
  });
  // At the end: first the sun rises, then the promise beside it (gentle fades, no bounce).
  const sun = useAnimatedStyle(() => {
    const p = ending(t.value, 0, 0.45);
    return { opacity: p, transform: [{ scale: 0.85 + 0.15 * p }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 * ending(t.value, 0, 0.45) }));
  const dest = useAnimatedStyle(() => {
    const p = ending(t.value, 0.35, 1);
    return { opacity: p, transform: [{ translateX: -8 * (1 - p) }] };
  });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Your journey: ${STOPS.map((s) => s.label).join(', then ')}. Then: your time back, for the work and life you love: family, health, growth.`}
    >
      <View style={[styles.roadBase, { top: roadTop, height: roadLength }]} />
      <Animated.View style={[styles.roadDrawn, { top: roadTop }, done ? { height: roadLength } : road]} />

      {STOPS.map((stop, i) => (
        <Stop key={stop.label} t={t} i={i} stop={stop} rowHeight={rowHeight} done={done} />
      ))}

      {/* The destination: the sun on the road, the promise beside it. */}
      <View style={styles.destRow}>
        <View style={styles.sunCol}>
          <Animated.View style={[styles.glow, done ? styles.glowDone : glow]} />
          <Animated.View style={[styles.sun, done ? null : sun]}>
            <Ionicons name="sunny" size={26} color={colors.onColor} />
          </Animated.View>
        </View>
        <Animated.View style={[styles.destText, done ? null : dest]}>
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
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { alignSelf: 'stretch', marginTop: spacing.lg },
  roadBase: { position: 'absolute', left: COL / 2 - 2, width: 4, borderRadius: 2, backgroundColor: colors.border, opacity: 0.6 },
  roadDrawn: { position: 'absolute', left: COL / 2 - 2, width: 4, borderRadius: 2, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { width: COL, alignItems: 'center' },
  labelWrap: { flex: 1, marginLeft: GAP },
  label: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.text },
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
  destRow: { flexDirection: 'row', alignItems: 'flex-start' },
  sunCol: { width: COL, height: SUN + SUN_TOP * 2, alignItems: 'center', paddingTop: SUN_TOP },
  glow: { position: 'absolute', top: SUN_TOP - 14, width: SUN + 28, height: SUN + 28, borderRadius: (SUN + 28) / 2, backgroundColor: brand.apricot },
  glowDone: { opacity: 0.35 },
  sun: { width: SUN, height: SUN, borderRadius: SUN / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  destText: { flex: 1, marginLeft: GAP, paddingTop: 2 },
  // The payoff reads as one statement: a big headline, then who it's for, warm like the sun.
  destTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  destLine: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.accentText },
  forRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm + 2 },
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
