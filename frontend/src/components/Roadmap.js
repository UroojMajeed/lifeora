import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

// The journey as a simple flow: one short action per stop, walking down the road to your time back.
const STOPS = [
  { icon: 'cash', label: "Know your hour's worth" },
  { icon: 'list', label: 'Map your routine' },
  { icon: 'pie-chart', label: 'See what drains you' },
  { icon: 'hand-left', label: 'Hand it off' },
];
const DESTINATION = { title: 'Your time back', line: 'for the work and life you love' };

const NODE = 44;
const GAP = 14; // between a node and its label
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

function Stop({ t, i, stop, side, rowHeight, done }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  // Labels alternate right / left of the road, so the road can run straight down the middle.
  const onRight = i % 2 === 0;

  // The stop and its label fade in together (the label drifts out from the road)…
  const appear = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0, 0.3) }));
  const label = useAnimatedStyle(() => {
    const p = between(local(t.value, i), 0.05, 0.4);
    return { opacity: p, transform: [{ translateX: (onRight ? -8 : 8) * (1 - p) }] };
  });
  // …then it lights up.
  const lit = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0.3, 0.55) }));

  const text = (
    <Animated.View style={[styles.side, { width: side }, onRight ? styles.sideRight : styles.sideLeft, done ? null : label]}>
      <Text style={[styles.label, { textAlign: onRight ? 'left' : 'right' }]} numberOfLines={2}>
        {stop.label}
      </Text>
    </Animated.View>
  );

  return (
    <View style={[styles.row, { height: rowHeight }]}>
      {onRight ? <View style={{ width: side }} /> : text}
      <Animated.View style={[styles.nodeWrap, done ? null : appear]}>
        <View style={styles.node}>
          <Animated.View style={[styles.nodeLit, done ? null : lit]}>
            <Ionicons name={stop.icon} size={20} color={colors.onColor} />
          </Animated.View>
        </View>
      </Animated.View>
      {onRight ? text : <View style={{ width: side }} />}
    </View>
  );
}

/**
 * The journey screen's road map: four stops, one short action each ("Know your hour's worth" →
 * "Map your routine" → "See what drains you" → "Hand it off"), down a road to the sun and the
 * promise: "Your time back, for the work and life you love". Plays once, one stop at a time.
 * Shown complete when reduce-motion is on, and for sure once the run is over.
 */
export default function Roadmap({ height = 320 }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
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

  const rowHeight = Math.max(56, Math.min(84, (height - 120) / STOPS.length));
  const side = Math.max(0, (width - NODE - GAP * 2) / 2);
  const roadTop = rowHeight / 2;
  const roadLength = rowHeight * STOPS.length; // from the first stop down to the sun

  // The road runs on to the next stop once this one has lit up; the last stretch reaches the sun.
  const road = useAnimatedStyle(() => {
    let drawn = 0;
    for (let i = 0; i < STOPS.length; i += 1) drawn += between(local(t.value, i), 0.6, 1);
    return { height: rowHeight * drawn };
  });
  // At the end: first the sun rises, then the promise under it (gentle fades, no bounce).
  const sun = useAnimatedStyle(() => {
    const p = ending(t.value, 0, 0.45);
    return { opacity: p, transform: [{ scale: 0.85 + 0.15 * p }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 * ending(t.value, 0, 0.45) }));
  const dest = useAnimatedStyle(() => {
    const p = ending(t.value, 0.4, 1);
    return { opacity: p, transform: [{ translateY: 6 * (1 - p) }] };
  });

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel={`Your journey: ${STOPS.map((s) => s.label).join(', then ')}. Then: your time back, for the work and life you love.`}
    >
      {width ? (
        <>
          <View style={[styles.roadBase, { top: roadTop, height: roadLength, left: width / 2 - 2 }]} />
          <Animated.View style={[styles.roadDrawn, { top: roadTop, left: width / 2 - 2 }, done ? { height: roadLength } : road]} />

          {STOPS.map((stop, i) => (
            <Stop key={stop.label} t={t} i={i} stop={stop} side={side} rowHeight={rowHeight} done={done} />
          ))}

          <View style={styles.sunWrap}>
            <Animated.View style={[styles.glow, done ? styles.glowDone : glow]} />
            <Animated.View style={[styles.sun, done ? null : sun]}>
              <Ionicons name="sunny" size={26} color={colors.onColor} />
            </Animated.View>
          </View>
          <Animated.View style={done ? null : dest}>
            <Text style={styles.destTitle}>{DESTINATION.title}</Text>
            <Text style={styles.destLine}>{DESTINATION.line}</Text>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { alignSelf: 'stretch', marginTop: spacing.lg },
  roadBase: { position: 'absolute', width: 4, borderRadius: 2, backgroundColor: colors.border, opacity: 0.6 },
  roadDrawn: { position: 'absolute', width: 4, borderRadius: 2, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { justifyContent: 'center' },
  sideRight: { alignItems: 'flex-start' },
  sideLeft: { alignItems: 'flex-end' },
  label: { fontSize: 16, lineHeight: 21, fontWeight: '700', color: colors.text },
  nodeWrap: { width: NODE + GAP * 2, alignItems: 'center', justifyContent: 'center' },
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
  sunWrap: { alignItems: 'center', justifyContent: 'center', height: 96, marginTop: 4 },
  glow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: brand.apricot },
  glowDone: { opacity: 0.35 },
  sun: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  // The payoff reads as one statement: a big headline, then who it's for, warm like the sun.
  destTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  destLine: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.accentText, textAlign: 'center', marginTop: 2 },
});
