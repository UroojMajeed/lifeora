import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { HeroCard } from './Card';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

/**
 * Home's headline: the hours you've bought back a week, with a bar against every hour that drains
 * you, and the journey's promise under it. Tapping opens your handoffs.
 */
export default function HoursBackCard({ summary, onPress }) {
  const styles = useStyles(makeStyles);
  const bar = useSharedValue(0);

  const draining = summary?.drainingHours || 0;
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const nothingDrains = Boolean(summary) && !summary.total;
  const share = draining ? bought / draining : nothingDrains ? 1 : 0;

  // One quiet fill (no count-up, no bounce).
  useEffect(() => {
    bar.value = withTiming(share, { duration: 900, easing: Easing.out(Easing.cubic) });
  }, [share, bar]);
  const fill = useAnimatedStyle(() => ({ width: `${bar.value * 100}%` }));

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Hours back: ${formatHours(bought * WORKDAYS_PER_WEEK)} a week of ${formatHours(draining * WORKDAYS_PER_WEEK)} that drain you. Open your handoffs.`}
      style={({ pressed }) => pressed && { opacity: 0.95 }}
    >
      <HeroCard style={styles.card}>
        <Text style={styles.label}>Hours back</Text>
        <Text style={styles.big}>
          {summary ? formatHours(bought * WORKDAYS_PER_WEEK) : '–'}
          <Text style={styles.per}> a week</Text>
        </Text>
        <View style={styles.track}>
          <Animated.View style={[styles.fill, fill]} />
        </View>
        <Text style={styles.sub}>
          {nothingDrains ? 'Nothing in your routine drains you' : `of ${formatHours(draining * WORKDAYS_PER_WEEK)} a week that drain you`}
        </Text>
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
  track: { height: 10, borderRadius: 5, marginTop: spacing.sm + 2, backgroundColor: colors.heroChip, overflow: 'hidden' },
  fill: { height: 10, borderRadius: 5, backgroundColor: brand.apricot },
  sub: { color: colors.heroMuted, fontSize: 13, fontWeight: '600', marginTop: spacing.sm },
  promise: { color: brand.apricot, fontSize: 14, fontWeight: '800', marginTop: 4 },
});
