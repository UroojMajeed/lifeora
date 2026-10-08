import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// A work day as blocks (width = hours). Draining ones get handed off; energizing ones fill the time.
const BLOCKS = [
  { h: 2, drain: true },
  { h: 1, drain: false },
  { h: 1.5, drain: true },
  { h: 2.5, drain: false },
  { h: 1.5, drain: true },
  { h: 1.5, drain: false },
];
const TOTAL = BLOCKS.reduce((t, b) => t + b.h, 0);
const ENERGY = BLOCKS.filter((b) => !b.drain).reduce((t, b) => t + b.h, 0);
const BOUGHT = BLOCKS.filter((b) => b.drain).reduce((t, b) => t + b.h, 0);
const DRAINS = BLOCKS.map((b, i) => (b.drain ? i : -1)).filter((i) => i >= 0);

const CYCLE_MS = 7000;
const GAP = 3;
// Timeline (0 → 1 per loop): rest, drains leave one by one, hold the result, then ease back.
const START = 0.18;
const STEP = 0.14;
const LEAVE = 0.12;
const RESET = 0.88;
const BAR_HEIGHT = 30;

const clamp01 = (v) => {
  'worklet';
  return Math.min(1, Math.max(0, v));
};
// How far drain number k has left (0 → 1), easing back to 0 at the end of the loop.
const gone = (t, k) => {
  'worklet';
  const p = clamp01((t - (START + k * STEP)) / LEAVE);
  const back = t < RESET ? 1 : 1 - clamp01((t - RESET) / (1 - RESET));
  return p * back;
};

function Block({ t, index, unit }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const block = BLOCKS[index];
  const k = DRAINS.indexOf(index);
  const style = useAnimatedStyle(() => {
    if (block.drain) {
      const g = gone(t.value, k);
      return { width: Math.max(0, block.h * unit * (1 - g) - GAP), opacity: 1 - g, marginRight: g > 0.98 ? 0 : GAP };
    }
    // Energizing blocks grow into the freed time.
    let removed = 0;
    for (let j = 0; j < DRAINS.length; j += 1) removed += BLOCKS[DRAINS[j]].h * gone(t.value, j);
    return { width: block.h * unit * (1 + removed / ENERGY) - GAP, marginRight: GAP };
  });
  return <Animated.View style={[styles.block, { backgroundColor: block.drain ? colors.drainBlock : colors.primary }, style]} />;
}

/** A "+2h" that rises where a draining block was, and stays until the loop restarts. */
function Gain({ t, k, left }) {
  const styles = useStyles(makeStyles);
  const style = useAnimatedStyle(() => {
    const g = gone(t.value, k);
    return { opacity: g, transform: [{ translateY: -6 - g * 14 }] };
  });
  return (
    <Animated.Text style={[styles.gain, { left: left - 20 }, style]} numberOfLines={1}>
      +{BLOCKS[DRAINS[k]].h}h
    </Animated.Text>
  );
}

/**
 * The start screen's picture of the app: a work day where draining tasks are handed off one by one
 * (each leaves "+Xh" behind) and energizing work fills the time. One calm loop; a still picture of
 * the end state when the phone asks for reduced motion.
 */
export default function DayBar() {
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) t.value = RESET - 0.01; // the finished picture, standing still
      else t.value = withRepeat(withTiming(1, { duration: CYCLE_MS, easing: Easing.linear }), -1, false);
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const unit = width / TOTAL;
  const total = useAnimatedStyle(() => {
    const show = clamp01((t.value - (START + DRAINS.length * STEP)) / 0.06);
    const back = t.value < RESET ? 1 : 1 - clamp01((t.value - RESET) / (1 - RESET));
    return { opacity: show * back };
  });

  // Where each draining block starts on the bar (for its "+Xh").
  let x = 0;
  const centers = BLOCKS.map((b) => {
    const c = x + (b.h * unit) / 2;
    x += b.h * unit;
    return c;
  });

  return (
    <View
      style={styles.wrap}
      accessible
      accessibilityLabel={`A work day where the draining tasks are handed off and ${BOUGHT} hours are bought back.`}
    >
      <View style={styles.gains} pointerEvents="none">
        {width ? DRAINS.map((i, k) => <Gain key={i} t={t} k={k} left={centers[i]} />) : null}
      </View>
      <View style={styles.bar} onLayout={(e) => setWidth(e.nativeEvent.layout.width + GAP)}>
        {width ? BLOCKS.map((b, i) => <Block key={i} t={t} index={i} unit={unit} />) : null}
      </View>
      <Animated.View style={[styles.totalRow, total]}>
        <Text style={styles.total}>+{BOUGHT}h a day bought back</Text>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { alignSelf: 'stretch', marginTop: spacing.xl },
  gains: { height: 26 },
  bar: { flexDirection: 'row', height: BAR_HEIGHT, overflow: 'hidden', borderRadius: radius.pill },
  block: { height: BAR_HEIGHT, borderRadius: 8 },
  gain: { position: 'absolute', bottom: 0, width: 40, textAlign: 'center', fontSize: 13, fontWeight: '800', color: colors.accentText },
  totalRow: { alignItems: 'center', marginTop: spacing.sm + 2 },
  total: { fontSize: 15, fontWeight: '800', color: colors.primaryDark },
});
