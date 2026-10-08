import { useEffect, useMemo, useState } from 'react';
import { AccessibilityInfo, Text, View } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop as GradientStop } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// The journey onboarding takes you on, ending where it's all for.
const STOPS = [
  { icon: 'cash', title: 'Know your worth', line: 'What your hour is really worth' },
  { icon: 'pie-chart', title: 'See what drains you', line: 'Your work, by money and energy' },
  { icon: 'swap-horizontal', title: 'Hand it off', line: 'Your first task to let go' },
];
const DESTINATION = { title: 'Your time, back', line: 'For the work and life you love' };

const HEIGHT = 300;
const NODE = 44;
const SUN = 52;
const DRAW_MS = 3200;

// Point on a cubic Bézier.
const bez = (t, a, b, c, d) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};
const segLength = (s) => {
  let len = 0;
  let prev = { x: s[0].x, y: s[0].y };
  for (let i = 1; i <= 30; i += 1) {
    const t = i / 30;
    const p = { x: bez(t, s[0].x, s[1].x, s[2].x, s[3].x), y: bez(t, s[0].y, s[1].y, s[2].y, s[3].y) };
    len += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  return len;
};

/** A stop on the road: an outlined circle that softly fills in when the road reaches it. */
function Node({ progress, at, stop, x, y, labelSide, width }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const lit = useAnimatedStyle(() => ({ opacity: progress.value >= at ? withTiming(1, { duration: 400 }) : 0 }));
  const label = labelSide === 'right' ? { left: x + NODE / 2 + 12, right: 0 } : { left: 0, width: x - NODE / 2 - 12 };
  return (
    <>
      <View style={[styles.node, { left: x - NODE / 2, top: y - NODE / 2 }]}>
        <Ionicons name={`${stop.icon}-outline`} size={20} color={colors.primary} />
        <Animated.View style={[styles.nodeLit, lit]}>
          <Ionicons name={stop.icon} size={20} color={colors.onColor} />
        </Animated.View>
      </View>
      <View style={[styles.labelBox, label, { top: y - 20 }]}>
        <Text style={[styles.title, labelSide === 'left' && styles.alignRight]}>{stop.title}</Text>
        <Text style={[styles.line, labelSide === 'left' && styles.alignRight]}>{stop.line}</Text>
      </View>
    </>
  );
}

/**
 * The start screen's road map: a winding road from teal (busy) to apricot (sunrise) through three
 * stops (know your worth, see what drains you, hand it off) to the sun: "Your time, back".
 * The road draws itself once and each stop fills in as it's reached; the sun glows at the end.
 * With reduced motion it's shown complete.
 */
export default function Roadmap() {
  const styles = useStyles(makeStyles);
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (cancelled) return;
      if (reduce) progress.value = 1;
      else progress.value = withDelay(300, withTiming(1, { duration: DRAW_MS, easing: Easing.inOut(Easing.quad) }));
    });
    return () => {
      cancelled = true;
    };
  }, [progress]);

  // The road: left, right, left, then down to the sun in the middle.
  const geo = useMemo(() => {
    const pts = [
      { x: width * 0.24, y: 24 },
      { x: width * 0.76, y: 104 },
      { x: width * 0.24, y: 184 },
      { x: width * 0.5, y: 262 },
    ];
    const segs = [];
    for (let i = 0; i < 3; i += 1) {
      const a = pts[i];
      const b = pts[i + 1];
      segs.push([a, { x: a.x, y: a.y + 44 }, { x: b.x, y: b.y - 44 }, b]);
    }
    const lens = segs.map(segLength);
    const total = lens.reduce((t, l) => t + l, 0) || 1;
    const d = `M${pts[0].x} ${pts[0].y} ${segs.map((s) => `C${s[1].x} ${s[1].y} ${s[2].x} ${s[2].y} ${s[3].x} ${s[3].y}`).join(' ')}`;
    const reachAt = [0, lens[0] / total, (lens[0] + lens[1]) / total, 1];
    return { pts, d, total, reachAt };
  }, [width]);

  const drawn = useAnimatedProps(() => ({ strokeDashoffset: geo.total * (1 - progress.value) }));
  const sunGlow = useAnimatedStyle(() => ({
    opacity: progress.value >= 0.98 ? withTiming(0.28, { duration: 700 }) : 0,
    transform: [{ scale: progress.value >= 0.98 ? withTiming(1, { duration: 900 }) : 0.6 }],
  }));
  const sunLit = useAnimatedStyle(() => ({ opacity: progress.value >= 0.98 ? withTiming(1, { duration: 500 }) : 0.35 }));
  const sun = geo.pts[3];

  return (
    <View
      style={styles.wrap}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      accessible
      accessibilityLabel="Your journey: know your worth, see what drains you, hand it off, and get your time back for the work and life you love."
    >
      {width ? (
        <>
          <Svg width={width} height={HEIGHT} style={styles.svg}>
            <Defs>
              <LinearGradient id="road" x1="0" y1="0" x2="0" y2="1">
                <GradientStop offset="0" stopColor={colors.primary} />
                <GradientStop offset="1" stopColor={brand.apricot} />
              </LinearGradient>
            </Defs>
            {/* The whole road, faint, so you can see where it goes… */}
            <Path d={geo.d} stroke={colors.border} strokeWidth={5} strokeLinecap="round" fill="none" />
            {/* …and the part already travelled, in colour, drawing itself towards the sun. */}
            <AnimatedPath
              d={geo.d}
              stroke="url(#road)"
              strokeWidth={5}
              strokeLinecap="round"
              fill="none"
              strokeDasharray={`${geo.total} ${geo.total}`}
              animatedProps={drawn}
            />
          </Svg>

          {STOPS.map((stop, i) => (
            <Node
              key={stop.title}
              progress={progress}
              at={geo.reachAt[i]}
              stop={stop}
              x={geo.pts[i].x}
              y={geo.pts[i].y}
              labelSide={i === 1 ? 'left' : 'right'}
              width={width}
            />
          ))}

          {/* The destination: a warm sun with a soft glow. */}
          <Animated.View style={[styles.glow, { left: sun.x - 46, top: sun.y - 46 }, sunGlow]} />
          <Animated.View style={[styles.sun, { left: sun.x - SUN / 2, top: sun.y - SUN / 2 }, sunLit]}>
            <Ionicons name="sunny" size={26} color={colors.onColor} />
          </Animated.View>
          <View style={[styles.destination, { top: sun.y + SUN / 2 + 6 }]}>
            <Text style={styles.destTitle}>{DESTINATION.title}</Text>
            <Text style={styles.destLine}>{DESTINATION.line}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { alignSelf: 'stretch', height: HEIGHT + 48, marginTop: spacing.lg },
  svg: { position: 'absolute', left: 0, top: 0 },
  node: {
    position: 'absolute',
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
  labelBox: { position: 'absolute' },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  line: { fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 2 },
  alignRight: { textAlign: 'right' },
  glow: { position: 'absolute', width: 92, height: 92, borderRadius: 46, backgroundColor: brand.apricot },
  sun: {
    position: 'absolute',
    width: SUN,
    height: SUN,
    borderRadius: SUN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: brand.apricot,
  },
  destination: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  destTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  destLine: { fontSize: 13, color: colors.muted, marginTop: 2 },
});
