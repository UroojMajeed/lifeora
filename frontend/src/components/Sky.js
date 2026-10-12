import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

// Where the clouds sit (centre, as fractions of the sky), biggest task first.
const SLOTS = [
  { x: 0.28, y: 0.3 },
  { x: 0.73, y: 0.22 },
  { x: 0.52, y: 0.5 },
  { x: 0.22, y: 0.64 },
  { x: 0.8, y: 0.6 },
];

/** One draining task as a grey cloud with its name; it drifts a little and fades away once handed off. */
function Cloud({ task, slot, sky, index, still, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const size = Math.max(96, Math.min(140, 88 + task.hours * 14));
  const drift = useSharedValue(0);

  // A slow, small drift so the sky feels alive (off with reduce-motion).
  useEffect(() => {
    if (still) return;
    const ms = 5200 + index * 700;
    drift.value = withRepeat(
      withSequence(withTiming(5, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(-5, { duration: ms, easing: Easing.inOut(Easing.sin) })),
      -1,
      true
    );
  }, [still, index, drift]);
  const float = useAnimatedStyle(() => ({ transform: [{ translateX: drift.value }] }));

  return (
    <Animated.View
      exiting={FadeOut.duration(700)}
      style={[styles.cloud, { width: size, left: sky.w * slot.x - size / 2, top: sky.h * slot.y - size / 2 }, float]}
    >
      <Pressable
        onPress={onPress}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`${task.activity}, ${formatHours(task.hours * WORKDAYS_PER_WEEK)} a week. Hand it off.`}
        style={({ pressed }) => [styles.cloudPress, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
      >
        <Ionicons name="cloud" size={size} color={colors.cloud} />
        <View style={[styles.cloudText, { top: size * 0.42 }]} pointerEvents="none">
          <Text style={styles.cloudName} numberOfLines={1}>
            {task.activity}
          </Text>
          <Text style={styles.cloudHours}>{formatHours(task.hours * WORKDAYS_PER_WEEK)}/wk</Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

/**
 * Home's sky: your time is the sun, rising from behind the hill as you buy it back (`progress`, 0–1).
 * Each task that still drains you is a grey cloud in front of it (the biggest five); tapping one
 * opens its handoff. Hand it off and the cloud drifts away. A clear sky means your time is yours.
 */
export default function Sky({ tasks = [], progress = 0, onCloud, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [sky, setSky] = useState(null);
  const [still, setStill] = useState(false);
  const rise = useSharedValue(progress);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill);
  }, []);

  // The sun rises slowly to where your progress is.
  useEffect(() => {
    rise.value = withTiming(progress, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [progress, rise]);

  const sun = sky ? Math.min(sky.w * 0.3, sky.h * 0.32, 120) : 0;
  const sunStyle = useAnimatedStyle(() => {
    if (!sky) return {};
    // From half behind the hill (nothing bought back) to high in the sky (everything).
    const y = sky.h * (0.86 - 0.56 * rise.value);
    return { transform: [{ translateY: y - sun }] }; // the glow box is 2× the sun, centred on y
  });

  const shown = [...tasks].sort((a, b) => b.hours - a.hours).slice(0, SLOTS.length);
  const more = tasks.length - shown.length;

  return (
    <View style={[styles.sky, style]} onLayout={(e) => setSky({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {sky ? (
        <>
          {/* The sun and its glow */}
          <Animated.View style={[styles.sunWrap, { left: sky.w / 2 - sun, width: sun * 2, height: sun * 2 }, sunStyle]}>
            <View style={[styles.glow, { width: sun * 2, height: sun * 2, borderRadius: sun }]} />
            <View style={[styles.glowInner, { width: sun * 1.45, height: sun * 1.45, borderRadius: sun * 0.725 }]} />
            <View style={[styles.sun, { width: sun, height: sun, borderRadius: sun / 2 }]} />
          </Animated.View>

          {/* The hill the sun rises from */}
          <View
            style={[
              styles.hill,
              { left: -sky.w * 0.25, width: sky.w * 1.5, top: sky.h * 0.84, height: sky.w, borderRadius: sky.w * 0.75 },
              { backgroundColor: colors.hill },
            ]}
          />

          {/* The clouds: what still drains you */}
          {shown.map((t, i) => (
            <Cloud key={t.activity} task={t} slot={SLOTS[i]} sky={sky} index={i} still={still} onPress={() => onCloud(t.activity)} />
          ))}
          {more > 0 ? <Text style={[styles.more, { color: colors.muted }]}>+{more} more</Text> : null}
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  sky: { flex: 1, overflow: 'hidden', marginHorizontal: -spacing.lg },
  sunWrap: { position: 'absolute', top: 0, alignItems: 'center', justifyContent: 'center' },
  glow: { position: 'absolute', backgroundColor: brand.apricot, opacity: isDark ? 0.14 : 0.18 },
  glowInner: { position: 'absolute', backgroundColor: brand.apricot, opacity: isDark ? 0.22 : 0.28 },
  sun: { backgroundColor: brand.apricot },
  hill: { position: 'absolute' },
  cloud: { position: 'absolute', alignItems: 'center' },
  cloudPress: { alignItems: 'center' },
  cloudText: { position: 'absolute', left: '14%', right: '14%', alignItems: 'center' },
  cloudName: { fontSize: 12, fontWeight: '800', color: colors.cloudInk },
  cloudHours: { fontSize: 10, fontWeight: '700', color: colors.cloudInk, opacity: 0.75 },
  more: { position: 'absolute', right: 12, top: 8, fontSize: 12, fontWeight: '700' },
});
