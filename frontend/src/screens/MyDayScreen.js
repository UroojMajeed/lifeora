import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { Card, HeroCard } from '../components/Card';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { DRIP, summarizeSchedule } from '../constants/content';
import { FILL_TIMES, dayNow, scheduleNow } from '../constants/fill';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// Active activities first, then new ones from Fill, then what you've handed off.
const order = (a) => (a.handedOff ? 2 : a.isFill ? 1 : 0);

/** Your day as it is now: what still drains you, every activity (handed-off tasks marked, filled time in), and ways to change it. */
export default function MyDayScreen({ navigation }) {
  const { onboarding } = useOnboarding();
  const { handoffs, fills, summary: handoffSummary } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const rate = onboarding?.buybackRate || 0;
  const currency = onboarding?.currency || 'USD';
  const schedule = onboarding?.schedule || [];

  const day = dayNow(schedule, handoffs, fills);
  const summary = summarizeSchedule(scheduleNow(day), rate);
  const unsorted = schedule.filter((i) => !i.energy).length;
  const rows = [...day].sort((a, b) => order(a) - order(b));

  return (
    <Screen edges={['top']} contentStyle={styles.top}>
      {unsorted ? (
        <Button
          title={`Rate ${unsorted} new ${unsorted === 1 ? 'activity' : 'activities'}`}
          icon="stats-chart"
          onPress={() => navigation.navigate('Swipe', { editing: true })}
          style={styles.unsorted}
        />
      ) : null}

      {summary.drainingHours > 0 ? (
        <HeroCard>
          <Text style={styles.heroLabel}>Still draining you</Text>
          <Text style={styles.heroBig}>{formatHours(summary.drainingHours)} a day</Text>
          <Text style={styles.heroBody}>
            Handing them off at your {formatMoney(rate, currency)}/hr Buyback Rate costs about{' '}
            {formatMoney(summary.dailyBuybackCost, currency, { decimals: 0 })} a day.
          </Text>
        </HeroCard>
      ) : null}

      {rows.length ? (
        <>
          <Text style={[styles.section, !summary.drainingHours && styles.first]}>Your routine now</Text>
          <Card style={styles.list}>
            {rows.map((a, i) => {
              const q = a.quadrant ? DRIP[a.quadrant] : null;
              const when = a.when ? FILL_TIMES.find((t) => t.key === a.when)?.label : null;
              return (
                <View key={`${a.activity}-${i}`} style={[styles.row, i > 0 && styles.rowBorder]}>
                  <View style={[styles.dot, { backgroundColor: q ? colors[q.color] : colors.border }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.name, a.handedOff && styles.nameOff]} numberOfLines={1}>
                      {a.activity}
                    </Text>
                    <View style={styles.tags}>
                      {a.handedOff ? (
                        <Text style={[styles.tag, { color: colors.success, backgroundColor: colors.successSoft }]}>Handed off</Text>
                      ) : null}
                      {a.isFill || a.fillHours ? (
                        <Text style={[styles.tag, { color: colors.primaryDark, backgroundColor: colors.primarySoft }]}>
                          {a.isFill ? 'New from Fill' : `+${formatHours(a.fillHours)} from Fill`}
                        </Text>
                      ) : null}
                      {when ? <Text style={styles.when}>{when}</Text> : null}
                      {!a.energy && !a.isFill ? <Text style={styles.when}>Not rated yet</Text> : null}
                    </View>
                  </View>
                  <Text style={[styles.hours, a.handedOff && styles.nameOff]}>{formatHours(a.hours + a.fillHours)}</Text>
                </View>
              );
            })}
          </Card>
        </>
      ) : null}

      {(handoffSummary?.boughtBackHours || 0) > 0 ? (
        <Button title="Fill your freed time" icon="sunny-outline" onPress={() => navigation.navigate('Fill')} style={styles.gap} />
      ) : null}

      <Button
        title="Edit your routine"
        variant="secondary"
        icon="create-outline"
        onPress={() => navigation.navigate('Schedule', { editing: true })}
        style={styles.gap}
      />
      <View style={styles.hintRow}>
        <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
        <Text style={styles.hint}>Filled time is changed in Fill. It joins your routine for good at the next round.</Text>
      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  top: { paddingTop: spacing.md },
  gap: { marginTop: spacing.md },
  unsorted: { marginBottom: spacing.md },
  section: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  first: { marginTop: 0 },
  list: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: spacing.sm + 2 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 10, height: 10, borderRadius: 5 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  nameOff: { color: colors.muted, textDecorationLine: 'line-through' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, marginTop: 2 },
  tag: { fontSize: 11, fontWeight: '700', paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  when: { fontSize: 12, color: colors.muted },
  hours: { fontSize: 15, fontWeight: '800', color: colors.text },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroBig: { color: colors.heroText, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroBody: { color: colors.heroMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', flexShrink: 1 },
});
