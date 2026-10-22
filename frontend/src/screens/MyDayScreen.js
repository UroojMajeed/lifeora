import { useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import CardHeader, { homeCard } from '../components/CardHeader';
import DripGraph from '../components/DripGraph';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { quadrantFor, valueForMoney } from '../constants/content';
import { dayNow, scheduleNow } from '../constants/fill';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// Active tasks first, then reinvested time, then what you've handed off.
const order = (a) => (a.handedOff ? 2 : a.isFill ? 1 : 0);
const quadrantOf = (a) => a.quadrant || (a.energy ? quadrantFor({ value: a.money ? valueForMoney(a.money) : a.value, energy: a.energy }) : null);

/**
 * Your routine as it is now, in Home's style: your DRIP Matrix (where each task sits today: handed-off
 * tasks out, reinvested time in), then every task with its hours (handed off and reinvested marked),
 * and a way to edit them.
 */
export default function MyDayScreen({ navigation }) {
  const { onboarding } = useOnboarding();
  const { handoffs, fills } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [selected, setSelected] = useState(null);

  const schedule = onboarding?.schedule || [];
  const day = dayNow(schedule, handoffs, fills);
  const now = scheduleNow(day);
  const unsorted = schedule.filter((i) => !i.energy).length;
  const rows = [...day].sort((a, b) => order(a) - order(b));
  const total = now.reduce((t, a) => t + a.hours, 0);
  const tasks = now.length;

  return (
    <Screen edges={['top']}>
      <PageHeader eyebrow="Routine" title="Your Routine" subtitle="Your work day as it is now." />

      {unsorted ? (
        <View style={[styles.card, styles.cardUrgent]}>
          <CardHeader icon="sparkles" iconColor={colors.primary} title={`${unsorted} New ${unsorted === 1 ? 'Task' : 'Tasks'}`} sub="Rate them to see where they sit" />
          <Button title="Rate now" icon="arrow-forward" onPress={() => navigation.navigate('Swipe', { editing: true })} style={styles.cardButton} />
        </View>
      ) : null}

      {/* Where each task sits today. */}
      {now.some((a) => a.energy) ? (
        <View style={styles.card}>
          <CardHeader icon="grid" iconColor={colors.accentText} title="Your DRIP Matrix" sub="Tap a task to see it" />
          <View style={styles.graph}>
            <DripGraph items={now} selected={selected} onSelect={(name) => setSelected((cur) => (cur === name ? null : name))} height={300} />
          </View>
        </View>
      ) : null}

      {/* Every task, with its hours. */}
      {rows.length ? (
        <View style={styles.card}>
          <CardHeader icon="list" iconColor={colors.primary} title="Every Task" sub={`${formatHours(total)} a day · ${tasks} ${tasks === 1 ? 'task' : 'tasks'}`} />
          <View style={styles.list}>
            {rows.map((a, i) => {
              const q = quadrantOf(a);
              return (
                <View key={`${a.activity}-${i}`} style={[styles.row, i > 0 && styles.rowLine]}>
                  <View style={[styles.dot, { backgroundColor: q ? colors.chart[q] : colors.border }]} />
                  <View style={styles.rowMain}>
                    <Text style={[styles.name, a.handedOff && styles.off]} numberOfLines={1}>
                      {a.activity}
                    </Text>
                    {a.handedOff || a.isFill || a.fillHours || (!a.energy && !a.isFill) ? (
                      <View style={styles.tags}>
                        {a.handedOff ? <Text style={[styles.tag, styles.tagDone]}>Handed off</Text> : null}
                        {a.isFill ? <Text style={[styles.tag, styles.tagNew]}>Reinvested</Text> : null}
                        {!a.isFill && a.fillHours ? <Text style={[styles.tag, styles.tagNew]}>+{formatHours(a.fillHours)} reinvested</Text> : null}
                        {!a.energy && !a.isFill ? <Text style={styles.muted}>Not rated yet</Text> : null}
                      </View>
                    ) : null}
                  </View>
                  <Text style={[styles.hours, a.handedOff && styles.off]}>{formatHours(a.hours + a.fillHours)}</Text>
                </View>
              );
            })}
          </View>
        </View>
      ) : null}

      <Button
        title="Edit your tasks"
        variant="secondary"
        icon="create-outline"
        onPress={() => navigation.navigate('Schedule', { editing: true })}
        style={styles.edit}
      />
    </Screen>
  );
}

const makeStyles = (colors, isDark) => ({
  card: { ...homeCard(colors, isDark), backgroundColor: colors.surface, marginBottom: spacing.md },
  cardUrgent: { borderWidth: 1.5, borderColor: colors.primary },
  cardButton: { marginTop: spacing.md },
  graph: { marginTop: spacing.md },
  list: { marginTop: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm + 2 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  rowMain: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  off: { color: colors.muted, textDecorationLine: 'line-through' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 3 },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  tagDone: { color: colors.chart.production, backgroundColor: colors.successSoft },
  tagNew: { color: colors.accentText, backgroundColor: colors.accentSoft },
  muted: { fontSize: 12, color: colors.muted },
  hours: { fontSize: 15, fontWeight: '800', color: colors.text },
  edit: { marginTop: spacing.sm },
});
