import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, cardShadow, radius, spacing } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const RING = 112;
const STROKE = 11;
const R = (RING - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * Home's hero, the one number that matters: hours bought back a week, as a sun-coloured ring filling
 * toward every hour that drains you, with the journey's promise under it. The same sunrise as the
 * journey screen, so Home feels like where the road led. Tapping opens your handoffs.
 */
export default function TimeBackCard({ summary, streak, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const progress = useSharedValue(0);

  const draining = summary?.drainingHours || 0;
  const bought = summary?.boughtBackHours || 0;
  // This round's goal: every draining hour except the tasks kept for the next round.
  const roundDraining = Math.max(0, draining - (summary?.laterHours || 0));
  const nothingDrains = Boolean(summary) && !summary.total;
  const target = summary ? (roundDraining ? Math.min(1, bought / roundDraining) : nothingDrains ? 1 : 0) : 0;

  // One quiet fill when the number changes (no bounce).
  useEffect(() => {
    progress.value = withTiming(target, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [target, progress]);
  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: CIRCUMFERENCE * (1 - progress.value) }));

  const perWeek = bought * WORKDAYS_PER_WEEK;
  const goalWeek = roundDraining * WORKDAYS_PER_WEEK;
  const filled = summary?.filledHours || 0;

  let big = summary ? formatHours(perWeek) : '–';
  let sub = summary ? `of ${formatHours(goalWeek)} that drain you` : 'Loading…';
  if (nothingDrains) {
    big = 'All yours';
    sub = 'Nothing in your routine drains you';
  } else if (summary && !roundDraining && draining) {
    sub = 'All kept for the next round';
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Time back: ${formatHours(perWeek)} a week, ${sub}. Open your handoffs.`}
      style={({ pressed }) => [styles.shell, pressed && { opacity: 0.95 }]}
    >
      <LinearGradient colors={colors.dawnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        <View style={styles.ring}>
          <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
            <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.goldLine} strokeWidth={STROKE} fill="none" />
            <AnimatedCircle
              cx={RING / 2}
              cy={RING / 2}
              r={R}
              stroke={brand.apricot}
              strokeWidth={STROKE}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
              animatedProps={ringProps}
              rotation={-90}
              origin={`${RING / 2}, ${RING / 2}`}
            />
          </Svg>
          <Ionicons name="sunny" size={30} color={brand.apricot} />
        </View>

        <View style={styles.text}>
          <View style={styles.top}>
            <Text style={styles.label}>Time back</Text>
            {streak?.weeks ? (
              <View style={styles.streak}>
                <Ionicons name="flame" size={12} color={colors.accentText} />
                <Text style={styles.streakText}>{streak.weeks}w</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
            {big}
            {summary && !nothingDrains ? <Text style={styles.per}> a week</Text> : null}
          </Text>
          <Text style={styles.sub}>{sub}</Text>
          <Text style={styles.promise}>for the work and life you love</Text>
          {bought > 0 ? (
            <Text style={styles.fill}>
              {filled >= bought ? 'Every freed hour has a new job' : `${formatHours(filled)} of ${formatHours(bought)} a day given a new job`}
            </Text>
          ) : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const makeStyles = (colors, isDark) => ({
  // The shell carries the shadow; the gradient inside carries the sunrise and rounded corners.
  shell: { borderRadius: radius.lg, ...cardShadow(colors, isDark) },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.goldLine,
    overflow: 'hidden',
  },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  streakText: { fontSize: 12, fontWeight: '800', color: colors.accentText },
  big: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: colors.text, letterSpacing: -0.8, marginTop: 2 },
  per: { fontSize: 16, fontWeight: '700', color: colors.text, letterSpacing: 0 },
  sub: { fontSize: 13, lineHeight: 18, color: colors.muted },
  promise: { fontSize: 13, lineHeight: 18, fontWeight: '800', color: colors.accentText, marginTop: 6 },
  fill: { fontSize: 12, lineHeight: 16, fontWeight: '600', color: colors.muted, marginTop: 4 },
});
