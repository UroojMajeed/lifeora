import { useEffect } from 'react';
import { Text, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { hoursLabel, suggestionsFor, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

// Faded example cards, a little more see-through the further down they are.
const GHOST_OPACITY = [0.9, 0.6, 0.35];

/**
 * The routine list before anything is added: a friendly heading, faded example tasks for the
 * user's role (a preview of what the list will look like) and a bobbing arrow towards the
 * suggestion cards below.
 */
export default function EmptyRoutine({ role }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const examples = suggestionsFor(role).slice(0, 3);

  const bob = useSharedValue(0);
  useEffect(() => {
    bob.value = withRepeat(
      withSequence(withTiming(6, { duration: 600, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 600, easing: Easing.inOut(Easing.quad) })),
      -1
    );
  }, [bob]);
  const arrow = useAnimatedStyle(() => ({ transform: [{ translateY: bob.value }] }));

  return (
    <View style={styles.wrap}>
      <Animated.View entering={FadeInDown.duration(400)} style={styles.badge}>
        <Ionicons name="sparkles" size={22} color={colors.accent} />
      </Animated.View>
      <Animated.Text entering={FadeInDown.duration(400).delay(60)} style={styles.title}>
        Let's map your routine
      </Animated.Text>
      <Animated.Text entering={FadeInDown.duration(400).delay(120)} style={styles.text}>
        Add the tasks you do on a normal work day. Most people add 5–8.
      </Animated.Text>

      <View style={styles.ghosts} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {examples.map((name, i) => (
          <Animated.View
            key={name}
            entering={FadeInDown.duration(450).delay(200 + i * 90)}
            style={[styles.ghost, { opacity: GHOST_OPACITY[i] }]}
          >
            <View style={styles.ghostDot} />
            <Text style={styles.ghostName} numberOfLines={1}>
              {name}
            </Text>
            {usualHours(name) ? <Text style={styles.ghostHours}>{hoursLabel(usualHours(name))}</Text> : null}
          </Animated.View>
        ))}
      </View>

      <Animated.View entering={FadeInDown.duration(400).delay(520)} style={styles.hintRow}>
        <Text style={styles.hint}>Tap a suggestion below to start</Text>
        <Animated.View style={arrow}>
          <Ionicons name="arrow-down" size={18} color={colors.primary} />
        </Animated.View>
      </Animated.View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.lg },
  badge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, marginTop: spacing.md, letterSpacing: -0.4 },
  text: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 300 },
  ghosts: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  ghost: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
    ...cardShadow(colors, isDark),
  },
  ghostDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primarySoft, borderWidth: 1.5, borderColor: colors.primary },
  ghostName: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.muted },
  ghostHours: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    overflow: 'hidden',
  },
  hintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.lg },
  hint: { fontSize: 14, fontWeight: '700', color: colors.primary },
});
