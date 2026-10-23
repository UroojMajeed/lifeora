import { Text, View } from 'react-native';
import Button from './Button';
import CardHeader, { homeCard } from './CardHeader';
import { journeyOf } from '../constants/journey';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;

/**
 * Home's move card: the drain you're handing off and where you left off in its steps (one dot per
 * step), with a button back to that step. The task is the one you've started, or else the biggest
 * drain not handed off yet. `next` once you've handed one off ("Your Next Move").
 */
export default function JourneyPreviewCard({ handoffs = [], onOpen, next, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const open = handoffs.filter((x) => x.status === 'mine' || x.status === 'in_progress').sort((a, b) => b.hours - a.hours);
  const task = open.find((x) => x.method && !journeyOf(x).finished) || open[0];
  if (!task) return null;
  const { steps, current, doneCount } = journeyOf(task);
  const started = doneCount > 0;

  return (
    <View style={[styles.card, style]}>
      <CardHeader icon="flag" iconColor={colors.accentText} title={next ? 'Your Next Move' : 'Your First Move'} sub={started ? `Handing off ${task.activity}` : `Hand off ${task.activity} · ${h(task.hours)} a day`} />
      {/* Where you are: one dot per step. */}
      <View style={styles.track}>
        {steps.map((s, i) => (
          <View key={s.key} style={styles.seg}>
            <View style={[styles.dot, s.done && styles.dotDone, current?.key === s.key && styles.dotNow]} />
            {i < steps.length - 1 ? <View style={[styles.bar, s.done && styles.barDone]} /> : null}
          </View>
        ))}
      </View>
      <Text style={styles.next}>
        {current ? (
          <>
            Step {doneCount + 1} of {steps.length}: <Text style={styles.nextStrong}>{current.title}</Text>
          </>
        ) : (
          'All steps done'
        )}
      </Text>
      <Button title={started ? 'Continue' : 'Start handing it off'} icon="arrow-forward" onPress={() => onOpen(task.activity)} style={styles.button} />
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.tintMove },
  track: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md },
  seg: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  dot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  dotDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  dotNow: { borderColor: brand.apricot, backgroundColor: colors.accentSoft, borderWidth: 3 },
  bar: { flex: 1, height: 3, marginHorizontal: 4, borderRadius: 2, backgroundColor: colors.border },
  barDone: { backgroundColor: colors.primary },
  next: { fontSize: 14, color: colors.muted, marginTop: spacing.sm + 2 },
  nextStrong: { fontWeight: '800', color: colors.text },
  button: { marginTop: spacing.md },
});
