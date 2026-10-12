import { useEffect, useState } from 'react';
import { AccessibilityInfo, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
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
import { StepDots } from './HandoffStepsRow';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { handoffSteps } from '../constants/handoffSteps';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

const HILL_TOP = 0.84; // where the hill starts, as a fraction of the scene's height
const SHOW = 5; // drains shown as labelled leaves; the rest lie on the ground

// Where the labelled leaves hang around the tree (centre, as fractions of the scene).
const LEAF_SLOTS = [
  { x: 0.17, y: 0.24, tilt: -24 },
  { x: 0.83, y: 0.2, tilt: 22 },
  { x: 0.13, y: 0.52, tilt: -12 },
  { x: 0.87, y: 0.5, tilt: 16 },
  { x: 0.5, y: 0.05, tilt: 6 },
];
// Fallen leaves on the ground for the drains beyond the first five.
const GROUND = [
  { x: 0.2, y: 0.9, tilt: 70 },
  { x: 0.76, y: 0.92, tilt: -50 },
  { x: 0.33, y: 0.95, tilt: 20 },
  { x: 0.64, y: 0.89, tilt: 110 },
  { x: 0.1, y: 0.94, tilt: -30 },
  { x: 0.88, y: 0.9, tilt: 40 },
  { x: 0.45, y: 0.92, tilt: -80 },
];
// The canopy (fractions of the tree box) and where blossoms open on it.
const CANOPY = [
  { x: 0.5, y: 0.3, r: 0.22 },
  { x: 0.31, y: 0.39, r: 0.17 },
  { x: 0.69, y: 0.37, r: 0.18 },
  { x: 0.41, y: 0.18, r: 0.16 },
  { x: 0.61, y: 0.17, r: 0.15 },
];
const BLOSSOMS = [
  { x: 0.42, y: 0.27 },
  { x: 0.62, y: 0.31 },
  { x: 0.28, y: 0.4 },
  { x: 0.72, y: 0.42 },
  { x: 0.5, y: 0.14 },
  { x: 0.55, y: 0.44 },
  { x: 0.37, y: 0.12 },
];

/** Blend two #rrggbb colours (t: 0 → a, 1 → b). */
function mix(a, b, t) {
  const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const c = [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/** A task that drains you, as a dry leaf with its name. It sways a little; handed off, it falls away. */
function DryLeaf({ task, slot, scene, index, still, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const sway = useSharedValue(0);
  // Started handing it off: the leaf shows how far along it is (same dots as below the tree).
  const steps = handoffSteps(task);
  const started = steps.some((s) => s.done);

  useEffect(() => {
    if (still) return;
    const ms = 2600 + index * 400;
    sway.value = withRepeat(
      withSequence(withTiming(1, { duration: ms, easing: Easing.inOut(Easing.sin) }), withTiming(-1, { duration: ms, easing: Easing.inOut(Easing.sin) })),
      -1,
      true
    );
  }, [still, index, sway]);
  const leafStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${slot.tilt + sway.value * 5}deg` }] }));

  return (
    <Animated.View exiting={FadeOut.duration(600)} style={[styles.leafWrap, { left: scene.w * slot.x - 50, top: scene.h * slot.y - 22 }]}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${task.activity} drains you ${formatHours(task.hours * WORKDAYS_PER_WEEK)} a week. Hand it off.`}
        style={({ pressed }) => [styles.leafPress, pressed && { opacity: 0.7, transform: [{ scale: 0.95 }] }]}
      >
        <Animated.View style={leafStyle}>
          <Ionicons name="leaf" size={30} color={colors.leafDry} />
        </Animated.View>
        <Text style={styles.leafName} numberOfLines={1}>
          {task.activity}
        </Text>
        <Text style={styles.leafHours}>{formatHours(task.hours * WORKDAYS_PER_WEEK)}/wk</Text>
        {started ? (
          <View style={styles.leafSteps}>
            <StepDots steps={steps} size={6} />
          </View>
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

/**
 * Home's tree: your time, growing on the hill. Each task that drains you is a dry leaf around it
 * (the biggest five, labelled; the rest lie on the ground; one you've started shows its step dots).
 * Tap a leaf to hand that task off. As you
 * buy time back (`progress`, 0–1) the tree grows and turns from dry olive to lush green; when the
 * freed time gets a new job (`bloom`, 0–1, from Fill) it blossoms. A small sun keeps the journey's light.
 */
export default function TimeTree({ tasks = [], progress = 0, bloom = 0, onLeaf, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [scene, setScene] = useState(null);
  const [still, setStill] = useState(false);
  const grow = useSharedValue(progress);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setStill);
  }, []);

  // The tree grows slowly to its new size.
  useEffect(() => {
    grow.value = withTiming(progress, { duration: 1400, easing: Easing.out(Easing.cubic) });
  }, [progress, grow]);
  const treeStyle = useAnimatedStyle(() => ({ transform: [{ scale: 0.72 + 0.28 * grow.value }] }));

  const shown = [...tasks].sort((a, b) => b.hours - a.hours).slice(0, SHOW);
  const fallen = tasks.length - shown.length;

  // The tree box: a square standing on the hill, centred.
  const S = scene ? Math.min(scene.w * 0.62, scene.h * 0.8) : 0;
  const canopy = mix(colors.canopyDry, colors.canopyLush, Math.min(1, progress));
  const canopyDark = mix(canopy, colors.trunk, 0.18);
  const blossoms = Math.round(Math.min(1, bloom) * BLOSSOMS.length);

  return (
    <View style={[styles.scene, style]} onLayout={(e) => setScene({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {scene ? (
        <>
          {/* A small sun: the journey's light, still shining on your time. */}
          <View style={[styles.sunGlow, { left: scene.w - 74, top: 10 }]} />
          <View style={[styles.sun, { left: scene.w - 62, top: 22 }]} />

          {/* The hill */}
          <View
            style={[
              styles.hill,
              { left: -scene.w * 0.25, width: scene.w * 1.5, top: scene.h * HILL_TOP, height: scene.w, borderRadius: scene.w * 0.75 },
            ]}
          />

          {/* The tree, growing from its base on the hill */}
          <Animated.View
            style={[styles.tree, { left: scene.w / 2 - S / 2, top: scene.h * HILL_TOP - S + 6, width: S, height: S, transformOrigin: 'bottom' }, treeStyle]}
            accessible
            accessibilityLabel={`Your time tree is ${Math.round(progress * 100)}% grown.`}
          >
            <Svg width={S} height={S}>
              {/* Trunk and two branches */}
              <Path
                d={`M ${S * 0.46} ${S} C ${S * 0.47} ${S * 0.75}, ${S * 0.47} ${S * 0.6}, ${S * 0.48} ${S * 0.42} L ${S * 0.52} ${S * 0.42} C ${S * 0.53} ${S * 0.6}, ${S * 0.53} ${S * 0.75}, ${S * 0.54} ${S} Z`}
                fill={colors.trunk}
              />
              <Path d={`M ${S * 0.49} ${S * 0.62} Q ${S * 0.4} ${S * 0.55}, ${S * 0.33} ${S * 0.44}`} stroke={colors.trunk} strokeWidth={S * 0.025} strokeLinecap="round" fill="none" />
              <Path d={`M ${S * 0.51} ${S * 0.58} Q ${S * 0.6} ${S * 0.5}, ${S * 0.67} ${S * 0.41}`} stroke={colors.trunk} strokeWidth={S * 0.025} strokeLinecap="round" fill="none" />
              {/* Canopy: a soft shadow layer, then the leaves */}
              {CANOPY.map((c, i) => (
                <Circle key={`d${i}`} cx={S * c.x} cy={S * (c.y + 0.02)} r={S * c.r} fill={canopyDark} />
              ))}
              {CANOPY.map((c, i) => (
                <Circle key={`c${i}`} cx={S * c.x} cy={S * c.y} r={S * c.r} fill={canopy} />
              ))}
              {/* Blossoms: freed time given a new job */}
              {BLOSSOMS.slice(0, blossoms).map((b, i) => (
                <Circle key={`b${i}`} cx={S * b.x} cy={S * b.y} r={S * 0.026} fill={brand.apricot} />
              ))}
            </Svg>
          </Animated.View>

          {/* Fallen leaves: the drains beyond the first five */}
          {GROUND.slice(0, fallen).map((g, i) => (
            <View key={`g${i}`} pointerEvents="none" style={[styles.fallen, { left: scene.w * g.x - 9, top: scene.h * g.y - 9, transform: [{ rotate: `${g.tilt}deg` }] }]}>
              <Ionicons name="leaf" size={18} color={colors.leafDry} />
            </View>
          ))}

          {/* The dry leaves: what still drains you */}
          {shown.map((t, i) => (
            <DryLeaf key={t.activity} task={t} slot={LEAF_SLOTS[i]} scene={scene} index={i} still={still} onPress={() => onLeaf(t.activity)} />
          ))}
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  // Edge to edge, so the hill runs off both sides of the screen.
  scene: { flex: 1, overflow: 'hidden', marginHorizontal: -spacing.lg },
  sunGlow: { position: 'absolute', width: 64, height: 64, borderRadius: 32, backgroundColor: brand.apricot, opacity: isDark ? 0.16 : 0.22 },
  sun: { position: 'absolute', width: 40, height: 40, borderRadius: 20, backgroundColor: brand.apricot },
  hill: { position: 'absolute', backgroundColor: colors.hill },
  tree: { position: 'absolute' },
  fallen: { position: 'absolute', opacity: 0.55 },
  leafWrap: { position: 'absolute', width: 100, alignItems: 'center' },
  leafPress: { alignItems: 'center' },
  leafName: { fontSize: 12, fontWeight: '800', color: colors.leafInk, marginTop: 2, maxWidth: 100, textAlign: 'center' },
  leafHours: { fontSize: 10, fontWeight: '700', color: colors.leafInk, opacity: 0.75 },
  leafSteps: { marginTop: 3 },
});
