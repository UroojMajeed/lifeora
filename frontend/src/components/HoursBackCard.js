import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { HeroCard } from './Card';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

const week = (hoursADay) => formatHours(hoursADay * WORKDAYS_PER_WEEK);

/** One labelled progress bar that fills once, quietly. */
function Bar({ label, share, value, color }) {
  const styles = useStyles(makeStyles);
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withTiming(share, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [share, p]);
  const fill = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));
  return (
    <View style={styles.bar}>
      <View style={styles.barHead}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={styles.barValue}>{value}</Text>
      </View>
      <View style={styles.track}>
        <Animated.View style={[styles.fill, { backgroundColor: color }, fill]} />
      </View>
    </View>
  );
}

/**
 * Home's progress, the journey's last two steps at a glance: the hours bought back a week (big),
 * then two bars: how much of what drains you is delegated, and how much of that freed time is
 * reinvested. The promise under it. Tapping opens your handoffs.
 */
export default function HoursBackCard({ summary, onPress }) {
  const styles = useStyles(makeStyles);
  const draining = summary?.drainingHours || 0;
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const filled = Math.min(summary?.filledHours || 0, bought);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hours back: ${week(bought)} a week. Delegated ${week(bought)} of ${week(draining)}; reinvested ${week(filled)} of ${week(bought)}. Open your handoffs.`}
      style={({ pressed }) => pressed && { opacity: 0.95 }}
    >
      <HeroCard style={styles.card}>
        <Text style={styles.label}>Hours back</Text>
        <Text style={styles.big}>
          {summary ? week(bought) : '–'}
          <Text style={styles.per}> a week</Text>
        </Text>
        <Bar label="Delegated" share={draining ? bought / draining : 0} value={`${week(bought)} of ${week(draining)}`} color={brand.apricot} />
        <Bar label="Reinvested" share={bought ? filled / bought : 0} value={`${week(filled)} of ${week(bought)}`} color={brand.mint} />
        <Text style={styles.promise}>for the work and life you love</Text>
      </HeroCard>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  card: { padding: spacing.md + 4 },
  label: { color: colors.heroMuted, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  big: { color: colors.heroText, fontSize: 36, lineHeight: 44, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  per: { fontSize: 18, fontWeight: '700', color: colors.heroMuted, letterSpacing: 0 },
  bar: { marginTop: spacing.sm + 2 },
  barHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barLabel: { color: colors.heroText, fontSize: 13, fontWeight: '700' },
  barValue: { color: colors.heroMuted, fontSize: 13, fontWeight: '600' },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.heroChip, overflow: 'hidden' },
  fill: { height: 8, borderRadius: 4 },
  promise: { color: brand.apricot, fontSize: 14, fontWeight: '800', marginTop: spacing.md },
});
