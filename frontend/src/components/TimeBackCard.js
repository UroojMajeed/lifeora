import { Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import CardHeader, { homeCard } from './CardHeader';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

const COL = 64; // the tallest week's column, in px
const h = (n) => `${Math.round(n * 10) / 10} h`;

/**
 * Your time back: the hours you've bought back so far (week by week, kept on this phone). The total
 * is the card's title; under it a column per week (this week highlighted) and what this week adds.
 * `weeks` is [{ key, hours, now }] oldest first; `totalHours` is all weeks so far.
 */
export default function TimeBackCard({ weeks = [], totalHours = 0, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  // Only the weeks since you started (no row of empty weeks for someone new).
  const first = weeks.findIndex((w) => w.hours > 0);
  const shown = first < 0 ? [] : weeks.slice(first);
  const max = Math.max(...shown.map((w) => w.hours), 0.5);
  const thisWeek = weeks.find((w) => w.now)?.hours || 0;
  const days = totalHours / 8; // a workday is 8 hours

  return (
    <Animated.View entering={FadeIn.duration(500)} style={[styles.card, style]}>
      <CardHeader
        icon="time"
        iconColor={colors.accentText}
        title={`${h(totalHours)} bought back`}
        sub={days >= 1 ? `About ${Math.round(days * 10) / 10} workdays of your time` : 'Your time, back for the work you love'}
      />

      {/* A column per week once there are two to compare; this week stands out. */}
      {shown.length > 1 ? (
        <View style={styles.weeks} accessible accessibilityLabel={`Bought back per week: ${shown.map((w) => h(w.hours)).join(', ')}`}>
          {shown.map((w, i) => (
            <View key={w.key} style={styles.week}>
              <View style={styles.colArea}>
                {w.hours ? <View style={[styles.col, { height: Math.max(6, (w.hours / max) * COL) }, w.now && styles.colNow]} /> : <View style={styles.colEmpty} />}
              </View>
              <Text style={[styles.weekLabel, w.now && styles.weekLabelNow]}>{w.now ? 'Now' : `Week ${i + 1}`}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.note}>
        {thisWeek ? (
          <>
            <Text style={styles.noteStrong}>+{h(thisWeek)} this week.</Text> Keep your handoffs going.
          </>
        ) : (
          'Each task you hand off adds to this every week.'
        )}
      </Text>
    </Animated.View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.accent }, // white with an apricot edge: apart from the peach move card
  weeks: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  week: { flex: 1, alignItems: 'center', gap: 4 },
  colArea: { height: COL, alignSelf: 'stretch', justifyContent: 'flex-end' },
  col: { borderTopLeftRadius: 8, borderTopRightRadius: 8, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, backgroundColor: colors.accent, opacity: 0.55 },
  colNow: { opacity: 1 },
  colEmpty: { height: 4, borderRadius: 2, backgroundColor: colors.calmTrack },
  weekLabel: { fontSize: 10, fontWeight: '700', color: colors.muted },
  weekLabelNow: { color: colors.accentText },
  note: { fontSize: 13, lineHeight: 19, color: colors.text, marginTop: spacing.sm + 2 },
  noteStrong: { fontWeight: '800', color: colors.accentText },
});
