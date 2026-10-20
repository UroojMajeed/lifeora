import { useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

// The four quadrants in the book's order of value; the two that drain you are marked under the graph.
const ORDER = ['production', 'replacement', 'investment', 'delegation'];
const DRAINS = new Set(['replacement', 'delegation']);
const PLOT = 128; // the columns' area, in px
const AXIS = 26; // room for the hour labels on the left

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });
const h = (n) => `${Math.round(n * 10) / 10} h`;

/** A round top for the hours axis (1, 2, 3, 4… or 2, 4, 6… for longer days), with headroom, and its ticks. */
function scaleFor(max) {
  const step = max > 6 ? 2 : 1;
  let top = Math.max(step, Math.ceil(max / step) * step);
  if (top - max < step * 0.4) top += step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

/** A column that rises from the baseline when Home opens (one after another), and eases to new heights. */
function Column({ height, index, color, style }) {
  const h = useSharedValue(0);
  useEffect(() => {
    h.value = withDelay(index * 90, withTiming(height, { duration: 600, easing: Easing.out(Easing.cubic) }));
  }, [height, index, h]);
  const rise = useAnimatedStyle(() => ({ height: h.value }));
  return <Animated.View style={[{ backgroundColor: color }, style, rise]} />;
}

/**
 * Home's first look on a first visit: your routine. Its size (hours a day, tasks), a bar graph with an
 * hours axis and a column per quadrant ("drains" marked under the two that drain you; tap a column
 * for its tasks), and the graph said in words: how much drains you, your biggest drain, and the hours
 * a week handing it off would free. `items` is the routine as it is now.
 */
export default function RoutineStats({ items = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(null);

  const rated = items.filter((it) => it.energy && it.hours);
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantOf(it)]?.push(it));
  const hoursOf = (k) => by[k].reduce((t, it) => t + it.hours, 0);
  const total = ORDER.reduce((t, k) => t + hoursOf(k), 0);
  const { top, ticks } = scaleFor(Math.max(...ORDER.map(hoursOf)));
  const yOf = (v) => PLOT - (v / top) * PLOT;

  const draining = rated.filter((it) => it.energy === 'draining');
  const drainHours = draining.reduce((t, it) => t + it.hours, 0);
  const biggest = [...draining].sort((a, b) => b.hours - a.hours)[0];

  const toggle = (k) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === k ? null : k));
  };

  return (
    <View style={[styles.card, style]}>
      <Text style={styles.label}>Your routine</Text>
      <Text style={styles.total}>
        {h(total)} <Text style={styles.totalSub}>a day · {rated.length} {rated.length === 1 ? 'task' : 'tasks'}</Text>
      </Text>

      {/* The graph: an hours axis with light grid lines, a column per quadrant with its hours on top. */}
      <View style={styles.chart}>
        {ticks.map((v) => (
          <View key={v} pointerEvents="none" style={[styles.gridRow, { top: yOf(v) - 7 }]}>
            <Text style={styles.tick}>{v ? `${v}h` : '0'}</Text>
            <View style={[styles.gridLine, v === 0 && styles.baseline]} />
          </View>
        ))}
        <View style={styles.columns}>
          {ORDER.map((k) => {
            const hours = hoursOf(k);
            const on = open === k;
            return (
              <Pressable
                key={k}
                onPress={() => toggle(k)}
                accessibilityRole="button"
                accessibilityState={{ expanded: on }}
                accessibilityLabel={`${DRIP[k].name}: ${formatHours(hours)} a day${DRAINS.has(k) ? ', drains you' : ''}. Tap to see its tasks.`}
                style={styles.slot}
              >
                <Text style={styles.colValue}>{hours ? formatHours(hours) : ''}</Text>
                <Column index={ORDER.indexOf(k)} height={Math.max(hours ? 4 : 0, (hours / top) * PLOT)} color={colors.chart[k]} style={[styles.col, on && styles.colOn]} />
              </Pressable>
            );
          })}
        </View>
      </View>
      <View style={styles.xLabels}>
        {ORDER.map((k) => (
          <Pressable key={k} onPress={() => toggle(k)} style={styles.xLabel} accessibilityElementsHidden>
            <Text style={[styles.xName, open === k && styles.xNameOn]} numberOfLines={1} adjustsFontSizeToFit>
              {DRIP[k].name}
            </Text>
            <Text style={styles.xShare}>{total ? Math.round((hoursOf(k) / total) * 100) : 0}%</Text>
            {DRAINS.has(k) ? (
              <Text style={styles.xDrains}>drains</Text>
            ) : (
              <Text style={styles.xCount}>
                {by[k].length} {by[k].length === 1 ? 'task' : 'tasks'}
              </Text>
            )}
          </Pressable>
        ))}
      </View>

      {open ? (
        <View style={styles.tasks}>
          <View style={[styles.key, { backgroundColor: colors.chart[open] }]} />
          <Text style={styles.tasksText}>
            <Text style={styles.tasksName}>{DRIP[open].name}: </Text>
            {by[open].length ? by[open].map((t) => `${t.activity} (${formatHours(t.hours)})`).join(' · ') : 'no tasks here.'}
          </Text>
        </View>
      ) : (
        <Text style={styles.hint}>Tap a column to see its tasks</Text>
      )}

      {/* The graph, said in words. */}
      {biggest ? (
        <View style={styles.insight}>
          <View style={styles.insightDot} />
          <Text style={styles.insightText}>
            <Text style={styles.insightStrong}>{h(drainHours)} a day drains you.</Text> Your biggest drain is {biggest.activity.toLowerCase()} (
            {h(biggest.hours)}). Handing it off frees {h(biggest.hours * WORKDAYS_PER_WEEK)} a week.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  total: { fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.6, marginTop: 4 },
  totalSub: { fontSize: 13, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  // The plot: grid rows behind, columns in front.
  chart: { height: PLOT, marginTop: spacing.lg },
  gridRow: { position: 'absolute', left: 0, right: 0, height: 14, flexDirection: 'row', alignItems: 'center' },
  tick: { width: AXIS - 6, textAlign: 'right', marginRight: 6, fontSize: 10, fontWeight: '600', color: colors.muted },
  // Light grid lines (solid: Android doesn't draw a one-sided dashed border reliably).
  gridLine: { flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.7 },
  baseline: { height: 1.5, backgroundColor: colors.muted, opacity: 0.5 },
  columns: { position: 'absolute', left: AXIS, right: 0, top: 0, bottom: 0, flexDirection: 'row', gap: 12, paddingHorizontal: 6 },
  slot: { flex: 1, alignItems: 'stretch', justifyContent: 'flex-end' },
  col: { borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  colOn: { borderWidth: 2, borderColor: colors.text, borderBottomWidth: 0 },
  colValue: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 3 },
  xLabels: { flexDirection: 'row', gap: 12, marginLeft: AXIS, paddingHorizontal: 6, marginTop: 6 },
  xLabel: { flex: 1, alignItems: 'center', minWidth: 0 },
  xName: { fontSize: 10, fontWeight: '700', color: colors.text },
  xNameOn: { fontWeight: '800', textDecorationLine: 'underline' },
  xShare: { fontSize: 15, fontWeight: '800', color: colors.text, marginTop: 2, letterSpacing: -0.3 },
  xCount: { fontSize: 10, fontWeight: '500', color: colors.muted, marginTop: 1 },
  xDrains: { fontSize: 10, fontWeight: '700', color: colors.error, marginTop: 1 },
  hint: { fontSize: 10, color: colors.muted, textAlign: 'center', marginTop: 6 },
  tasks: { flexDirection: 'row', gap: 6, marginTop: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  key: { width: 10, height: 10, borderRadius: 3, marginTop: 4 },
  tasksText: { flex: 1, fontSize: 12, lineHeight: 18, color: colors.text },
  tasksName: { fontWeight: '800' },
  // The insight: the graph in words.
  insight: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start', marginTop: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  insightDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent, marginTop: 6 },
  insightText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  insightStrong: { fontWeight: '800', color: colors.error },
});
