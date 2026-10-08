import { useEffect, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

// The three things onboarding gives you, in order (one per step).
const STOPS = [
  { icon: 'cash-outline', label: 'What your hour\nis worth' },
  { icon: 'pie-chart-outline', label: 'What drains\nyou' },
  { icon: 'swap-horizontal', label: 'Your first\nhandoff' },
];

const ROAD_HEIGHT = 64;
const STOP = 46; // icon circle size
const TRAVEL_MS = 2400;

// Point on a cubic Bézier curve at t (0 → 1).
const bezier = (t, p0, c1, c2, p1) => {
  'worklet';
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * c1 + 3 * u * t * t * c2 + t * t * t * p1;
};

/** One stop: lights up (filled) once the travelling dot reaches it. */
function Stop({ t, at, stop, x, y }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const lit = useAnimatedStyle(() => ({ opacity: t.value >= at - 0.02 ? withTiming(1, { duration: 250 }) : 0 }));
  return (
    <View style={[styles.stop, { left: x - 55, top: y - STOP / 2 }]}>
      <View style={styles.circle}>
        <Ionicons name={stop.icon} size={20} color={colors.primaryDark} />
        <Animated.View style={[styles.circleLit, lit]}>
          <Ionicons name={stop.icon.replace('-outline', '')} size={20} color={colors.onColor} />
        </Animated.View>
      </View>
      <Text style={styles.label}>{stop.label}</Text>
    </View>
  );
}

/**
 * The start screen's road map: three stops on a gently curving dotted road (what your hour is
 * worth → what drains you → your first handoff). A small apricot dot travels it once and each
 * stop lights up as it arrives; with reduced motion it's shown already lit.
 */
export default function Roadmap() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const t = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) t.value = 1;
      else t.value = withDelay(350, withTiming(1, { duration: TRAVEL_MS, easing: Easing.inOut(Easing.cubic) }));
    });
    return () => {
      cancelled = true;
    };
  }, [t]);

  // The road: left stop low, middle stop high, right stop low (two gentle curves).
  const pad = 55;
  const p0 = { x: pad, y: ROAD_HEIGHT - 18 };
  const p1 = { x: width / 2, y: 18 };
  const p2 = { x: width - pad, y: ROAD_HEIGHT - 18 };
  const seg1 = [p0, { x: p0.x + (p1.x - p0.x) * 0.5, y: p0.y }, { x: p0.x + (p1.x - p0.x) * 0.5, y: p1.y }, p1];
  const seg2 = [p1, { x: p1.x + (p2.x - p1.x) * 0.5, y: p1.y }, { x: p1.x + (p2.x - p1.x) * 0.5, y: p2.y }, p2];
  const d = `M${p0.x} ${p0.y} C${seg1[1].x} ${seg1[1].y} ${seg1[2].x} ${seg1[2].y} ${p1.x} ${p1.y} C${seg2[1].x} ${seg2[1].y} ${seg2[2].x} ${seg2[2].y} ${p2.x} ${p2.y}`;

  const dot = useAnimatedStyle(() => {
    const first = t.value < 0.5;
    const s = first ? seg1 : seg2;
    const local = first ? t.value * 2 : (t.value - 0.5) * 2;
    const x = bezier(local, s[0].x, s[1].x, s[2].x, s[3].x);
    const y = bezier(local, s[0].y, s[1].y, s[2].y, s[3].y);
    return { transform: [{ translateX: x - 7 }, { translateY: y - 7 }], opacity: t.value >= 0.995 ? 0 : 1 };
  });

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel="In a couple of minutes: what your hour is worth, what drains you, and your first task to hand off."
    >
      {width ? (
        <>
          <Svg width={width} height={ROAD_HEIGHT} style={styles.road}>
            <Path d={d} stroke={colors.border} strokeWidth={4} strokeLinecap="round" strokeDasharray="2 9" fill="none" />
          </Svg>
          <Animated.View style={[styles.dot, dot]} />
          {[p0, p1, p2].map((p, i) => (
            <Stop key={STOPS[i].label} t={t} at={i / 2} stop={STOPS[i]} x={p.x} y={p.y} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { alignSelf: 'stretch', height: ROAD_HEIGHT + 64, marginTop: spacing.xl },
  road: { position: 'absolute', left: 0, top: 0 },
  dot: { position: 'absolute', left: 0, top: 0, width: 14, height: 14, borderRadius: 7, backgroundColor: brand.apricot, zIndex: 3 },
  stop: { position: 'absolute', width: 110, alignItems: 'center' },
  circle: {
    width: STOP,
    height: STOP,
    borderRadius: STOP / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  circleLit: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  label: { fontSize: 12, lineHeight: 16, fontWeight: '700', color: colors.text, textAlign: 'center', marginTop: 6 },
});
