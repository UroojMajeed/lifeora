import { Pressable, Text, View } from 'react-native';
import Svg, { Defs, Line, Pattern, Rect, RadialGradient, Stop, Circle } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

// Home's four blocks: your routine, your next move, your production time, and your delegation list.

const ORDER = ['production', 'replacement', 'investment', 'delegation'];
const MEANING = {
  production: 'Energizes you, pays well',
  replacement: 'Pays well, drains you',
  investment: 'Energizes, builds the future',
  delegation: 'Drains you, pays little',
};

export const h = (n) => `${Math.round(n * 10) / 10} h`;
export const quadrantOf = (it) =>
  it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });

/** Hours a day per quadrant, for the rated tasks of a routine. */
export function hoursByQuadrant(items = []) {
  const by = { production: 0, replacement: 0, investment: 0, delegation: 0 };
  let tasks = 0;
  items.forEach((it) => {
    if (!it.energy || !it.hours) return;
    const k = quadrantOf(it);
    if (k in by) {
      by[k] += it.hours;
      tasks += 1;
    }
  });
  return { by, tasks, total: ORDER.reduce((t, k) => t + by[k], 0) };
}

/** Your routine: the day as one bar split by quadrant, then the four quadrants with hours and what they mean. */
export function RoutineCard({ items = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { by, tasks, total } = hoursByQuadrant(items);
  return (
    <View style={[styles.card, style]}>
      <Text style={styles.dayLine}>
        <Text style={styles.dayStrong}>Your day</Text> · {h(total)} · {tasks} {tasks === 1 ? 'task' : 'tasks'}
      </Text>
      <View style={styles.dayBar} accessibilityElementsHidden>
        {ORDER.filter((k) => by[k] > 0).map((k) => (
          <View key={k} style={{ flex: by[k], backgroundColor: colors.chart[k] }} />
        ))}
      </View>
      <View style={styles.grid}>
        {ORDER.map((k, i) => (
          <View
            key={k}
            accessible
            accessibilityLabel={`${DRIP[k].name}: ${h(by[k])} a day. ${MEANING[k]}.`}
            style={[styles.cell, i % 2 === 0 && styles.cellLeft, i < 2 && styles.cellTop]}
          >
            <View style={styles.cellHead}>
              <View style={[styles.key, { backgroundColor: colors.chart[k] }]} />
              <Text style={styles.cellName}>{DRIP[k].name}</Text>
            </View>
            <Text style={styles.cellHours}>
              {h(by[k])} <Text style={styles.cellShare}>{total ? Math.round((by[k] / total) * 100) : 0}%</Text>
            </Text>
            <Text style={styles.cellMeaning}>{MEANING[k]}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/**
 * The one dark card: the next draining task to hand off (Delegation before Replacement), what it
 * frees, and two answers. `task` null + `allDone`: everything is handed off. `audit`: tasks to rate first.
 */
export function MoveBlock({ task, first, allDone, boughtWeek, audit, onDelegated, onPlan, onAudit, onNextRound, loading }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  let tag;
  let title;
  let body;
  let main;
  let ghost = null;
  if (audit) {
    tag = 'Your next move';
    title = audit.title;
    body = audit.body;
    main = { title: audit.cta, onPress: onAudit };
  } else if (task) {
    const week = h(task.hours * WORKDAYS_PER_WEEK);
    tag = `${first ? 'Your first move' : 'Your next move'} · frees ${week} a week`;
    title = `Delegate ${task.activity.toLowerCase()}`;
    body =
      task.quadrant === 'replacement'
        ? `It takes ${h(task.hours)} a day and drains you, though it pays well. Write down how you do it, then hand it over.`
        : `It takes ${h(task.hours)} a day and drains you for little money. It's the easiest to hand off.`;
    main = { title: 'I delegated it', icon: 'checkmark', onPress: () => onDelegated(task.activity) };
    ghost = { title: 'Plan it', onPress: () => onPlan(task.activity) };
  } else if (allDone) {
    tag = 'All delegated';
    title = 'Everything that drained you is handed off';
    body = `You bought back ${h(boughtWeek)} a week. Start round 2 to audit your routine again.`;
    main = { title: 'Start round 2', icon: 'arrow-forward', onPress: onNextRound };
  } else return null;

  return (
    <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.move}>
      {/* A soft apricot glow in the corner, the sun of "your time back". */}
      <Svg pointerEvents="none" width={220} height={220} style={styles.glow}>
        <Defs>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={colors.accent} stopOpacity={0.45} />
            <Stop offset="1" stopColor={colors.accent} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={110} cy={110} r={110} fill="url(#glow)" />
      </Svg>
      <Text style={styles.moveTag}>{tag}</Text>
      <Text style={styles.moveTitle}>{title}</Text>
      <Text style={styles.moveBody}>{body}</Text>
      <View style={styles.moveButtons}>
        <Pressable
          onPress={main.onPress}
          disabled={loading}
          accessibilityRole="button"
          style={({ pressed }) => [styles.mainBtn, (pressed || loading) && styles.pressed]}
        >
          {main.icon ? <Ionicons name={main.icon} size={16} color={colors.heroFrom} /> : null}
          <Text style={styles.mainText}>{loading ? 'One moment…' : main.title}</Text>
        </Pressable>
        {ghost ? (
          <Pressable onPress={ghost.onPress} accessibilityRole="button" style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}>
            <Text style={styles.ghostText}>{ghost.title}</Text>
          </Pressable>
        ) : null}
      </View>
    </LinearGradient>
  );
}

/**
 * Your production time: the hours a day of your best work, growing with each task you hand off.
 * A solid base (at the audit) and a striped gain (the hours you bought back), on a scale of your day.
 */
export function ProductionCard({ base, gain, day, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const scale = Math.max(day, base + gain, 1);
  const now = base + gain;
  return (
    <View style={[styles.prod, style]}>
      <View style={styles.prodHead}>
        <Text style={styles.prodLabel}>Your production time</Text>
        {gain > 0 ? (
          <View style={styles.gainChip}>
            <Text style={styles.gainText}>+{h(gain)}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.prodBig}>
        {h(now)} <Text style={styles.prodSmall}>a day doing your best work</Text>
      </Text>
      <View style={styles.meter}>
        <View style={{ width: `${(base / scale) * 100}%`, backgroundColor: colors.chart.production }} />
        {gain > 0 ? (
          <View style={{ width: `${(gain / scale) * 100}%` }}>
            <Svg width="100%" height="100%">
              <Defs>
                <Pattern id="stripes" width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                  <Rect width={6} height={6} fill={colors.chart.production} opacity={0.35} />
                  <Line x1={0} y1={0} x2={0} y2={6} stroke={colors.chart.production} strokeWidth={3} />
                </Pattern>
              </Defs>
              <Rect width="100%" height="100%" fill="url(#stripes)" />
            </Svg>
          </View>
        ) : null}
      </View>
      <View style={styles.meterScale}>
        <Text style={styles.scaleText}>0</Text>
        <Text style={styles.scaleText}>Your day · {h(day)}</Text>
      </View>
      <Text style={styles.prodLine}>
        {gain > 0
          ? `+${h(gain * WORKDAYS_PER_WEEK)} a week of your best work, bought back by delegating.`
          : 'Each task you delegate adds its hours here.'}
      </Text>
    </View>
  );
}

/** The draining tasks, each marked "Not yet" or "Delegated". A tap switches it. */
export function DelegationList({ handoffs = [], onToggle, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const done = handoffs.filter((x) => x.status === 'done').length;
  if (!handoffs.length) return null;
  return (
    <View style={style}>
      <View style={styles.sectionRow}>
        <Text style={styles.section}>Delegation</Text>
        <Text style={styles.sectionNote}>
          {done} of {handoffs.length} delegated
        </Text>
      </View>
      <View style={styles.card}>
        {handoffs.map((x, i) => {
          const on = x.status === 'done';
          return (
            <Pressable
              key={x.activity}
              onPress={() => onToggle(x.activity, !on)}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${x.activity}, ${h(x.hours)} a day. ${on ? 'Delegated' : 'Not yet delegated'}.`}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && styles.pressed]}
            >
              <View style={styles.rowMain}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {x.activity}
                </Text>
                <Text style={styles.rowHours}>{h(x.hours)} a day</Text>
              </View>
              <View style={[styles.pill, on ? styles.pillOn : styles.pillOff]}>
                {on ? <Ionicons name="checkmark" size={13} color={colors.chart.production} /> : null}
                <Text style={[styles.pillText, { color: on ? colors.chart.production : colors.chart.delegation }]}>
                  {on ? 'Delegated' : 'Not yet'}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.hint}>Tap a task to mark it delegated</Text>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  pressed: { opacity: 0.7 },
  // Routine
  dayLine: { fontSize: 14, fontWeight: '600', color: colors.muted, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  dayStrong: { fontWeight: '800', color: colors.text },
  dayBar: { flexDirection: 'row', height: 12, gap: 2, borderRadius: 6, overflow: 'hidden', marginHorizontal: spacing.md, marginTop: spacing.sm + 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  cell: { width: '50%', padding: spacing.md },
  cellLeft: { borderRightWidth: 1, borderRightColor: colors.border },
  cellTop: { borderBottomWidth: 1, borderBottomColor: colors.border },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  key: { width: 10, height: 10, borderRadius: 3 },
  cellName: { fontSize: 13, fontWeight: '700', color: colors.text },
  cellHours: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: 6, letterSpacing: -0.3 },
  cellShare: { fontSize: 12, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  cellMeaning: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 16 },
  // Move
  move: { borderRadius: radius.lg, padding: spacing.lg, overflow: 'hidden' },
  glow: { position: 'absolute', top: -90, right: -80 },
  moveTag: { fontSize: 12, fontWeight: '700', color: colors.accent, letterSpacing: 0.4 },
  moveTitle: { fontSize: 20, fontWeight: '800', color: colors.heroText, marginTop: 6, letterSpacing: -0.3 },
  moveBody: { fontSize: 14, lineHeight: 20, color: colors.heroMuted, marginTop: 6 },
  moveButtons: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  mainBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: radius.md, backgroundColor: '#FFFFFF' },
  mainText: { fontSize: 15, fontWeight: '800', color: colors.heroFrom },
  ghostBtn: { paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: radius.md, borderWidth: 1, borderColor: colors.heroDivider, backgroundColor: colors.heroChip },
  ghostText: { fontSize: 15, fontWeight: '700', color: colors.heroText },
  // Production
  prod: { borderRadius: radius.lg, padding: spacing.md, backgroundColor: colors.successSoft },
  prodHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  prodLabel: { fontSize: 12, fontWeight: '700', color: colors.chart.production, letterSpacing: 0.8, textTransform: 'uppercase' },
  gainChip: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.surface },
  gainText: { fontSize: 12, fontWeight: '800', color: colors.chart.production },
  prodBig: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 6, letterSpacing: -0.6 },
  prodSmall: { fontSize: 14, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  meter: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', backgroundColor: colors.surface, marginTop: spacing.md },
  meterScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleText: { fontSize: 10, fontWeight: '600', color: colors.muted },
  prodLine: { fontSize: 13, lineHeight: 18, color: colors.text, marginTop: spacing.sm },
  // Delegation
  sectionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  section: { fontSize: 18, fontWeight: '800', color: colors.text },
  sectionNote: { fontSize: 13, fontWeight: '600', color: colors.muted },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  rowMain: { flex: 1, minWidth: 0 },
  rowName: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowHours: { fontSize: 12, color: colors.muted, marginTop: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14 },
  pillOn: { backgroundColor: colors.successSoft },
  pillOff: { backgroundColor: colors.errorSoft },
  pillText: { fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
});
