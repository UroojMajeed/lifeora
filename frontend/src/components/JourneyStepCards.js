import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import HandoffStepsRow from './HandoffStepsRow';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { handoffSteps } from '../constants/handoffSteps';
import { FILL_KINDS } from '../constants/fill';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const SHOW_STARTED = 2;

/** "STEP 3 · DELEGATION" on the left, a short status on the right. */
function StepHead({ step, name, status }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.head}>
      <Text style={styles.step}>
        Step {step} · <Text style={styles.stepName}>{name}</Text>
      </Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

/**
 * Journey step 3 on Home: the handoffs you've started (step dots, where you are, Continue), then the
 * biggest drain not started yet (Hand off), and a link to all of them.
 */
export function DelegationCard({ handoffs = [], onOpen, onSeeAll, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const doneSteps = (h) => handoffSteps(h).filter((s) => s.done).length;
  const handedOff = handoffs.filter((h) => h.status === 'done').length;
  const open = handoffs.filter((h) => h.status === 'mine' || h.status === 'in_progress');
  const started = open.filter((h) => doneSteps(h) > 0).sort((a, b) => doneSteps(b) - doneSteps(a));
  const nextUp = open.filter((h) => doneSteps(h) === 0).sort((a, b) => b.hours - a.hours)[0];

  let content;
  if (!handoffs.length) {
    content = <Text style={styles.empty}>Nothing in your routine drains you. Nothing to hand off.</Text>;
  } else if (!started.length && !nextUp) {
    content = (
      <View style={styles.allDone}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.allDoneText}>Everything that drained you is handed off or kept for later.</Text>
      </View>
    );
  } else {
    content = (
      <>
        {started.slice(0, SHOW_STARTED).map((h, i) => (
          <HandoffStepsRow key={h.activity} handoff={h} onOpen={() => onOpen(h.activity)} style={i > 0 && styles.line} />
        ))}
        {nextUp ? (
          <Pressable
            onPress={() => onOpen(nextUp.activity)}
            accessibilityRole="button"
            accessibilityLabel={`${nextUp.activity}, ${formatHours(nextUp.hours * WORKDAYS_PER_WEEK)} a week. Hand it off.`}
            style={({ pressed }) => [styles.row, started.length > 0 && styles.line, pressed && { opacity: 0.7 }]}
          >
            <View style={styles.dot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>
                {nextUp.activity}
              </Text>
              <Text style={styles.meta}>{formatHours(nextUp.hours * WORKDAYS_PER_WEEK)} a week · drains you</Text>
            </View>
            <View style={styles.action}>
              <Text style={styles.actionText}>Hand off</Text>
            </View>
          </Pressable>
        ) : null}
      </>
    );
  }

  return (
    <View style={style}>
      <StepHead step={3} name="Delegation" status={handoffs.length ? `${handedOff} of ${handoffs.length} handed off` : null} />
      <Card style={styles.card}>
        {content}
        {handoffs.length ? (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button" style={styles.link}>
            <Text style={styles.linkText}>See all {handoffs.length}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

/**
 * Journey step 4 on Home: the freed hours waiting for a new job, two ways in (both open Fill), and
 * what's filled so far. Before any handoff there's nothing to reinvest yet, so it says so, quietly.
 */
export function ReinvestCard({ summary, fills = [], onFill, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const bought = summary?.boughtBackHours || 0;
  const filled = summary?.filledHours || 0;
  const free = Math.max(0, Math.round((bought - filled) * 100) / 100);

  let content;
  if (!bought) {
    content = (
      <View style={styles.waiting}>
        <Ionicons name="sunny-outline" size={18} color={colors.muted} />
        <Text style={styles.waitingText}>Hand off your first task to free time. Then give it a new job here.</Text>
      </View>
    );
  } else {
    content = (
      <>
        {free >= 0.25 ? (
          <>
            <View style={styles.sunRow}>
              <Ionicons name="sunny" size={20} color={colors.accentText} />
              <Text style={styles.sunText}>Give your freed time a new job</Text>
            </View>
            <View style={styles.kinds}>
              {['production', 'investment'].map((k) => (
                <Pressable
                  key={k}
                  onPress={onFill}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.kind, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name={FILL_KINDS[k].icon} size={15} color={colors[FILL_KINDS[k].color]} />
                  <Text style={styles.kindText}>{FILL_KINDS[k].title}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.sunRow}>
            <Ionicons name="flower" size={18} color={colors.accentText} />
            <Text style={styles.sunText}>Every freed hour has a new job</Text>
          </View>
        )}
        {fills.length ? (
          <Text style={styles.filled} numberOfLines={2}>
            Filled so far: {fills.map((f) => `${f.activity} ${formatHours(f.hours)}`).join(' · ')}
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <View style={style}>
      <StepHead step={4} name="Reinvest" status={free >= 0.25 ? `${formatHours(free)} a day free` : null} />
      <Card style={[styles.card, !bought && styles.cardWaiting]}>{content}</Card>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  step: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' },
  stepName: { color: colors.text },
  status: { fontSize: 13, fontWeight: '700', color: colors.muted },
  card: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  cardWaiting: { opacity: 0.75 },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 56 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  name: { fontSize: 15, fontWeight: '800', color: colors.text },
  meta: { fontSize: 13, color: colors.muted, marginTop: 1 },
  action: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.primary },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.onColor },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  empty: { fontSize: 14, color: colors.muted, paddingVertical: spacing.sm },
  allDone: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  allDoneText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  waiting: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  waitingText: { flex: 1, fontSize: 14, color: colors.muted },
  sunRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingTop: spacing.sm },
  sunText: { fontSize: 15, fontWeight: '800', color: colors.text },
  kinds: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm + 2 },
  kind: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  kindText: { fontSize: 13, fontWeight: '700', color: colors.text },
  filled: { fontSize: 13, color: colors.muted, marginTop: spacing.sm + 2, marginBottom: spacing.xs },
});
