import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

// The journey as an exchange: what you give (quiet, left) → the step (middle) → what you get (bold, right).
const ROWS = [
  { icon: 'cash', give: ['Your role', 'Yearly pay'], get: 'Buyback Rate' },
  { icon: 'list', give: ['Your daily tasks'], get: 'Clear view of your time' },
  { icon: 'pie-chart', give: ['A swipe per task'], get: 'DRIP Matrix' },
  // The point of it all: hand off what drains you, get the hours back.
  { icon: 'hand-left', give: ['What drains you'], get: 'Hours back' },
];
const DESTINATION = { title: 'Your time back', line: 'for the work and life you love' };
// What the time is for: concrete pictures motivate more than the word "time".
const FOR = [
  { icon: 'heart', label: 'Family' },
  { icon: 'fitness', label: 'Health' },
  { icon: 'rocket', label: 'Growth' },
];

const NODE = 44;
const GAP = 12; // between the chips and the node
const ROW_MS = 1000; // each row's give → get, one after the other
const TOTAL_MS = ROWS.length * ROW_MS + 700; // + the sun

// This row's own 0 → 1 progress within the whole run.
const local = (t, i) => {
  'worklet';
  return Math.min(1, Math.max(0, (t * TOTAL_MS - i * ROW_MS) / ROW_MS));
};
const between = (v, a, b) => {
  'worklet';
  return Math.min(1, Math.max(0, (v - a) / (b - a)));
};

function Row({ t, i, row, side, rowHeight }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  // 1) a bead travels from what you give into the step…
  const bead = useAnimatedStyle(() => {
    const p = between(local(t.value, i), 0, 0.4);
    return { opacity: p > 0 && p < 1 ? 1 : 0, transform: [{ translateX: -GAP - 10 + p * (GAP + 10) }] };
  });
  // 2) …the step fills in…
  const lit = useAnimatedStyle(() => ({ opacity: between(local(t.value, i), 0.35, 0.55) }));
  // 3) …and what you get slides out and settles.
  const out = useAnimatedStyle(() => {
    const p = between(local(t.value, i), 0.5, 0.85);
    return { opacity: p, transform: [{ translateX: -14 * (1 - p) }, { scale: 0.92 + 0.08 * p }] };
  });
  const give = useAnimatedStyle(() => ({ opacity: 0.55 + 0.45 * between(local(t.value, i), 0, 0.25) }));

  return (
    <View style={[styles.row, { height: rowHeight }]}>
      <Animated.View style={[styles.side, styles.giveSide, { width: side }, give]}>
        {row.give.map((g) => (
          <View key={g} style={styles.giveChip}>
            <Text style={styles.giveText} numberOfLines={1}>
              {g}
            </Text>
          </View>
        ))}
      </Animated.View>

      <View style={styles.nodeWrap}>
        <Animated.View style={[styles.bead, bead]} />
        <View style={styles.node}>
          <Ionicons name={`${row.icon}-outline`} size={20} color={colors.primary} />
          <Animated.View style={[styles.nodeLit, lit]}>
            <Ionicons name={row.icon} size={20} color={colors.onColor} />
          </Animated.View>
        </View>
      </View>

      <Animated.View style={[styles.side, { width: side }, out]}>
        <View style={styles.getChip}>
          <Ionicons name="sparkles" size={12} color={colors.goldInk} />
          <Text style={styles.getText} numberOfLines={2}>
            {row.get}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * The journey screen's road map, as an exchange: for each step, what you give (role and pay, your
 * tasks, a swipe each) flows into the step and what you get (Buyback Rate, a clear view of your
 * time, your DRIP Matrix, then hours back from handing off what drains you) comes out, bold and
 * gold. Rows play once, one after another, then the sun rises with the promise: "Your time back,
 * for the work and life you love", and what it's for. Shown complete when reduce-motion is on.
 */
export default function Roadmap({ height = 320 }) {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) t.value = 1;
      else t.value = withDelay(300, withTiming(1, { duration: TOTAL_MS, easing: Easing.linear }));
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const rowHeight = Math.max(64, Math.min(100, (height - 96) / ROWS.length));
  const side = Math.max(0, (width - NODE - GAP * 2) / 2);
  const roadTop = rowHeight / 2;
  const roadLength = rowHeight * ROWS.length;

  // The road down the middle draws itself row by row, then reaches the sun.
  const road = useAnimatedStyle(() => ({ height: roadLength * Math.min(1, t.value * 1.02) }));
  const sun = useAnimatedStyle(() => {
    const p = between(t.value * TOTAL_MS, ROWS.length * ROW_MS, TOTAL_MS);
    return { opacity: 0.35 + 0.65 * p, transform: [{ scale: 0.85 + 0.15 * p }] };
  });
  const glow = useAnimatedStyle(() => ({ opacity: 0.35 * between(t.value * TOTAL_MS, ROWS.length * ROW_MS, TOTAL_MS) }));
  // The promise rises in with the sun (a gentle fade, no bounce).
  const dest = useAnimatedStyle(() => {
    const p = between(t.value * TOTAL_MS, ROWS.length * ROW_MS, TOTAL_MS);
    return { opacity: 0.4 + 0.6 * p, transform: [{ translateY: 6 * (1 - p) }] };
  });

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel="Your journey. Share your role and yearly pay, get your Buyback Rate. Add your daily tasks, get a clear view of your time. Swipe each task, get your DRIP Matrix. Hand off what drains you, get hours back. Then: your time back, for the work and life you love: family, health, growth."
    >
      {width ? (
        <>
          <View style={[styles.roadBase, { top: roadTop, height: roadLength, left: width / 2 - 2 }]} />
          <Animated.View style={[styles.roadDrawn, { top: roadTop, left: width / 2 - 2 }, road]} />

          {ROWS.map((row, i) => (
            <Row key={row.get} t={t} i={i} row={row} side={side} rowHeight={rowHeight} />
          ))}

          <View style={styles.sunWrap}>
            <Animated.View style={[styles.glow, glow]} />
            <Animated.View style={[styles.sun, sun]}>
              <Ionicons name="sunny" size={26} color={colors.onColor} />
            </Animated.View>
          </View>
          <Animated.View style={dest}>
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
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { alignSelf: 'stretch', marginTop: spacing.lg },
  roadBase: { position: 'absolute', width: 4, borderRadius: 2, backgroundColor: colors.border },
  roadDrawn: { position: 'absolute', width: 4, borderRadius: 2, backgroundColor: colors.primary },
  row: { flexDirection: 'row', alignItems: 'center' },
  side: { justifyContent: 'center' },
  giveSide: { alignItems: 'flex-end', gap: 4 },
  giveChip: {
    maxWidth: '100%',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  giveText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  nodeWrap: { width: NODE + GAP * 2, alignItems: 'center', justifyContent: 'center' },
  bead: { position: 'absolute', left: 0, width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  node: {
    width: NODE,
    height: NODE,
    borderRadius: NODE / 2,
    alignItems: 'center',
    justifyContent: 'center',
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
  getChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: colors.gold[0],
    borderWidth: 1,
    borderColor: colors.gold[1],
  },
  getText: { flexShrink: 1, fontSize: 13, lineHeight: 17, fontWeight: '800', color: colors.goldInk },
  sunWrap: { alignItems: 'center', justifyContent: 'center', height: 96, marginTop: 4 },
  glow: { position: 'absolute', width: 96, height: 96, borderRadius: 48, backgroundColor: brand.apricot },
  sun: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  // The payoff reads as one statement: a big headline, then who it's for, warm like the sun.
  destTitle: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  destLine: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.accentText, textAlign: 'center', marginTop: 2 },
  forRow: { flexDirection: 'row', justifyContent: 'center', gap: spacing.sm, marginTop: spacing.sm + 4 },
  forChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldLine,
  },
  forText: { fontSize: 13, fontWeight: '700', color: colors.text },
});
