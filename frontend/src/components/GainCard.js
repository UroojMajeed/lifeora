import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { WORKDAYS_PER_WEEK, WORKDAYS_PER_YEAR } from '../constants/home';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, cardShadow, radius, spacing } from '../theme';

// What the hours could become in a year: the journey's three chips, now with real numbers.
const GAINS = [
  { icon: 'heart', per: 3, label: (n) => `${n} family ${n === 1 ? 'evening' : 'evenings'}` }, // 3h each
  { icon: 'fitness', per: 1, label: (n) => `${n} ${n === 1 ? 'workout' : 'workouts'}` }, // 1h each
  { icon: 'rocket', per: 8, label: (n) => `${n} growth ${n === 1 ? 'day' : 'days'}` }, // a full workday each
];

const whole = (n) => Math.round(n).toLocaleString('en-US');

/**
 * Home's hero, drain → gain. First what your routine's draining hours cost you (a week, a year, and
 * in money at your hourly worth), with a bar of how much you've bought back so far. Then what the
 * rest would buy you in a year, as the journey's Family · Health · Growth chips, so the promise
 * from onboarding ("Your time back, for the work and life you love") turns into real numbers.
 */
export default function GainCard({ summary, effectiveHourlyRate = 0, currency, streak, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const bar = useSharedValue(0);

  const draining = summary?.drainingHours || 0; // a day, at the audit
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const left = Math.max(0, draining - bought); // still draining you, a day
  const nothingDrains = Boolean(summary) && !summary.total;
  const share = draining ? bought / draining : 0;

  // One quiet fill of the bar (no count-up, no bounce).
  useEffect(() => {
    bar.value = withTiming(share, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [share, bar]);
  const barStyle = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  const leftWeek = left * WORKDAYS_PER_WEEK;
  const leftYear = left * WORKDAYS_PER_YEAR;
  const cost = leftYear * effectiveHourlyRate;

  if (nothingDrains) {
    return (
      <Pressable onPress={onPress} accessibilityRole="button" style={styles.shell}>
        <LinearGradient colors={colors.dawnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
          <View style={styles.sunRow}>
            <View style={styles.sun}>
              <Ionicons name="sunny" size={22} color={colors.onColor} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.allTitle}>Your time is all yours</Text>
              <Text style={styles.promise}>for the work and life you love</Text>
            </View>
          </View>
          <Text style={styles.sub}>Nothing in your routine drains you. Keep it that way as you grow.</Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Draining you: ${formatHours(leftWeek)} a week, about ${whole(leftYear)} hours a year. Bought back so far: ${formatHours(bought * WORKDAYS_PER_WEEK)} a week. Open your handoffs.`}
      style={({ pressed }) => [styles.shell, pressed && { opacity: 0.95 }]}
    >
      <LinearGradient colors={colors.dawnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.card}>
        {/* The drain: what it costs you. */}
        <View style={styles.top}>
          <View style={styles.tag}>
            <Ionicons name="battery-dead" size={13} color={colors.error} />
            <Text style={styles.tagText}>Draining you</Text>
          </View>
          {streak?.weeks ? (
            <View style={styles.streak}>
              <Ionicons name="flame" size={12} color={colors.accentText} />
              <Text style={styles.streakText}>{streak.weeks}w streak</Text>
            </View>
          ) : null}
        </View>
        <Text style={styles.big} numberOfLines={1} adjustsFontSizeToFit>
          {summary ? formatHours(leftWeek) : '–'}
          <Text style={styles.per}> a week</Text>
        </Text>
        <Text style={styles.sub}>
          ≈ {whole(leftYear)} hours a year
          {effectiveHourlyRate ? (
            <>
              {' · '}
              <Text style={styles.cost}>{formatMoney(cost, currency, { decimals: 0 })}</Text> of your time
            </>
          ) : null}
        </Text>

        {/* How much is bought back so far. */}
        <View style={styles.track} accessibilityElementsHidden>
          <Animated.View style={[styles.fill, barStyle]} />
        </View>
        <View style={styles.trackLabels}>
          <Text style={styles.backText}>
            <Ionicons name="sunny" size={12} color={colors.accentText} /> {formatHours(bought * WORKDAYS_PER_WEEK)} a week back
          </Text>
          <Text style={styles.goalText}>of {formatHours(draining * WORKDAYS_PER_WEEK)}</Text>
        </View>

        {/* The gain: what the rest would buy you. */}
        <View style={styles.divider} />
        <Text style={styles.gainTitle}>Buy it back and get a year of</Text>
        <View style={styles.gains}>
          {GAINS.map((g) => (
            <View key={g.icon} style={styles.gain}>
              <Ionicons name={g.icon} size={13} color={colors.accentText} />
              <Text style={styles.gainText}>{g.label(Math.max(1, Math.round(leftYear / g.per)))}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.promise}>for the work and life you love</Text>
      </LinearGradient>
    </Pressable>
  );
}

const makeStyles = (colors, isDark) => ({
  // The shell carries the shadow; the gradient inside carries the sunrise and rounded corners.
  shell: { borderRadius: radius.lg, ...cardShadow(colors, isDark) },
  card: { padding: spacing.md + 4, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.goldLine, overflow: 'hidden' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: 12, fontWeight: '800', color: colors.error, textTransform: 'uppercase', letterSpacing: 1 },
  streak: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  streakText: { fontSize: 12, fontWeight: '800', color: colors.accentText },
  big: { fontSize: 40, lineHeight: 48, fontWeight: '800', color: colors.text, letterSpacing: -1, marginTop: 4 },
  per: { fontSize: 18, fontWeight: '700', letterSpacing: 0 },
  sub: { fontSize: 14, lineHeight: 20, color: colors.muted },
  cost: { fontWeight: '800', color: colors.error },
  track: { height: 10, borderRadius: 5, marginTop: spacing.md, backgroundColor: colors.errorSoft, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: brand.apricot },
  trackLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  backText: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  goalText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  divider: { height: 1, backgroundColor: colors.goldLine, marginVertical: spacing.md },
  gainTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  gains: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  gain: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.goldLine,
  },
  gainText: { fontSize: 13, fontWeight: '700', color: colors.text },
  promise: { fontSize: 13, fontWeight: '800', color: colors.accentText, marginTop: spacing.sm },
  sunRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  sun: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  allTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
});
