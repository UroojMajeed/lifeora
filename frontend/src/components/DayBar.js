import { LayoutAnimation, Text, View } from 'react-native';
import { quadrantFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;
const DAY = 8; // a typical work day; the bar stretches if your tasks add up to more

/**
 * Your day, filling up as you add tasks: one bar, a coloured part per task (its DRIP quadrant's
 * colour), out of a work day. The total and the task count sit above it.
 */
export default function DayBar({ items = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const done = items.filter((it) => it.hours);
  const total = done.reduce((t, it) => t + it.hours, 0);
  const scale = Math.max(DAY, total);
  const colorOf = (it) =>
    it.energy && it.money ? colors.chart[quadrantFor({ value: valueForMoney(it.money), energy: it.energy })] : colors.primary;

  return (
    <View style={style} accessible accessibilityLabel={`Your day so far: ${h(total)}, ${done.length} tasks`}>
      <View style={styles.head}>
        <Text style={styles.title}>Your day</Text>
        <Text style={styles.total}>
          {done.length ? `${h(total)} · ${done.length} ${done.length === 1 ? 'task' : 'tasks'}` : 'Add your first task'}
        </Text>
      </View>
      <View style={styles.bar}>
        {done.map((it) => (
          <View key={it.activity} style={{ flex: it.hours, backgroundColor: colorOf(it) }} />
        ))}
        {scale - total > 0 ? <View style={{ flex: scale - total }} /> : null}
      </View>
    </View>
  );
}

/** Animate the next change of the bar (call before adding a task). */
export const animateDayBar = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 6 },
  title: { fontSize: 14, fontWeight: '800', color: colors.text },
  total: { fontSize: 13, fontWeight: '600', color: colors.muted },
  bar: { flexDirection: 'row', gap: 2, height: 14, borderRadius: radius.pill, overflow: 'hidden', backgroundColor: colors.calmTrack, borderWidth: 1, borderColor: colors.border },
});
