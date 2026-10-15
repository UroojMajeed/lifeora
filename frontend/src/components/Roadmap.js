import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

// The book's journey in four steps: just a number on the road and the name beside it.
const STOPS = ['Know your worth', 'Time and energy audit', 'Delegation', 'Reinvest'];
const DESTINATION = { title: 'Your time back', line: 'for the work and life you love' };

const COL = 44; // the road's column: numbers and the sun are centred in it
const NODE = 30;
const SUN = 44; // the destination: bigger than a step, with a soft halo
const HALO = SUN + 22;
const GAP = 14; // between the road and the words
const ROAD = 28; // a stretch of road between two steps, on a phone ~800pt tall
// Responsive without stretching: everything grows or shrinks together with the screen height,
// within a small range (so the steps never drift apart on tall phones or cram on small ones).
const scaleFor = (height) => Math.min(1.15, Math.max(0.85, height / 800));
// One stop at a time, calm: each number appears and lights up, then the road runs on to the next.
const STOP_MS = 1100;
const END_MS = 1300; // the sun, then the promise
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

function Stop({ t, i, label, done, last, road, node }) {
  const styles = useStyles(makeStyles);

  // The number and its words fade in…
  const appear = useAnimatedStyle(() => {
    const p = between(local(t.value, i), 0, 0.35);
    return { opacity: p, transform: [{ translateY: 4 * (1 - p) }] };
  });
  // …the number lights up…
  const lit = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0.3, 0.55) }));
  // …and the road runs down to the next stop (the last one runs to the sun).
  const drawn = useAnimatedStyle(() => ({ height: `${100 * between(local(t.value, i), 0.6, 1)}%` }));

  return (
    <View>
      <Animated.View style={[styles.row, done ? null : appear]}>
        <View style={styles.col}>
          <View style={[styles.node, { width: node, height: node, borderRadius: node / 2 }]}>
            <Text style={styles.num}>{i + 1}</Text>
            <Animated.View style={[styles.nodeLit, done ? null : lit]}>
              <Text style={[styles.num, styles.numLit]}>{i + 1}</Text>
            </Animated.View>
          </View>
        </View>
        <Text style={styles.label} numberOfLines={1}>
          {label}
        </Text>
      </Animated.View>
      <View style={[styles.roadCol, { height: road }]}>
        {/* The last stretch, into the sun, is gold: the work leads to the reward. */}
        <View style={[styles.road, last && styles.roadGold]}>
          <Animated.View style={[styles.roadDrawn, last && styles.roadDrawnGold, done ? styles.roadFull : drawn]} />
        </View>
      </View>
    </View>
  );
}

/**
 * The journey screen's road map, kept to numbers and words: the book's four steps (Know your worth →
 * Time and energy audit → Delegation → Reinvest) as numbered stops down one road, ending at the sun
 * with the promise beside it: "Your time back, for the work and life you love". The block sits in the
 * middle of the screen and the road stretches to fill it. Plays once, one stop at a time; shown
 * complete when reduce-motion is on, and for sure once the run is over.
 */
export default function Roadmap() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const { height } = useWindowDimensions();
  const s = scaleFor(height);
  const road = Math.round(ROAD * s);
  const node = Math.round(NODE * s);
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
  const dest = useAnimatedStyle(() => {
    const p = ending(t.value, 0.3, 1);
    return { opacity: p, transform: [{ translateY: 4 * (1 - p) }] };
  });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`Your journey: ${STOPS.map((s, i) => `step ${i + 1}, ${s}`).join('; ')}. Then: your time back, for the work and life you love.`}
    >
      {STOPS.map((label, i) => (
        <Stop key={label} t={t} i={i} label={label} done={done} last={i === STOPS.length - 1} road={road} node={node} />
      ))}

      {/* The destination: the sun on the road, the promise beside it. */}
      <View style={styles.row}>
        <View style={styles.col}>
          <Animated.View style={[styles.sunWrap, done ? null : sun]}>
            <View style={styles.halo} />
            <View style={styles.sun}>
              <Ionicons name="sunny" size={24} color={colors.onColor} />
            </View>
          </Animated.View>
        </View>
        <Animated.View style={[styles.destText, done ? null : dest]}>
          <Text style={styles.destTitle}>{DESTINATION.title}</Text>
          <Text style={styles.destLine}>{DESTINATION.line}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  // In the middle of the room between the heading and the button; the block itself reads straight down.
  // Natural size, in the middle of the room between the heading and the button, lifted a little
  // above centre (the optical centre looks balanced; the true centre looks low).
  wrap: { flex: 1, alignSelf: 'center', justifyContent: 'center', paddingTop: spacing.md, paddingBottom: spacing.xl },
  // A stop grows only as far as its stretch of road can (so the road always meets the next number).
  row: { flexDirection: 'row', alignItems: 'center' },
  col: { width: COL, alignItems: 'center' },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
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
  num: { fontSize: 14, fontWeight: '800', color: colors.primary },
  numLit: { color: colors.onColor },
  label: { marginLeft: GAP, fontSize: 17, fontWeight: '700', color: colors.text },
  // A stretch of road under the number: faint until it's drawn in teal from the top.
  roadCol: { width: COL, alignItems: 'center', paddingVertical: 4 },
  road: { flex: 1, width: 3, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden' },
  roadDrawn: { width: 3, borderRadius: 2, backgroundColor: colors.primary },
  roadGold: { backgroundColor: colors.goldLine },
  roadDrawnGold: { backgroundColor: brand.apricot },
  roadFull: { height: '100%' },
  sunWrap: { width: HALO, height: HALO, alignItems: 'center', justifyContent: 'center', marginVertical: -(HALO - SUN) / 2 },
  halo: { position: 'absolute', width: HALO, height: HALO, borderRadius: HALO / 2, backgroundColor: brand.apricot, opacity: isDark ? 0.18 : 0.24 },
  sun: {
    width: SUN,
    height: SUN,
    borderRadius: SUN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.apricot,
    shadowColor: brand.apricot,
    shadowOpacity: isDark ? 0.5 : 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  destText: { marginLeft: GAP },
  // The payoff: bigger than the steps, and warm.
  destTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  destLine: { fontSize: 15, lineHeight: 20, fontWeight: '700', color: colors.accentText },
});
