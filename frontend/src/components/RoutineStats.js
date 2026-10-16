import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// The four quadrants in the book's order of value, each in its fixed chart colour.
const ORDER = ['production', 'replacement', 'investment', 'delegation'];
const PLOT = 160; // the bars' area, in px
const AXIS = 26; // room for the hour labels on the left

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });

/** A round top for the hours axis (1, 2, 3, 4… or 2, 4, 6… for longer days), and its ticks. */
function scaleFor(max) {
  const step = max > 6 ? 2 : 1;
  let top = Math.max(step, Math.ceil(max / step) * step);
  // Headroom for the hours written on top of the tallest column.
  if (top - max < step * 0.4) top += step;
  const ticks = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);
  return { top, ticks };
}

/**
 * Where your time goes, as a bar graph: an hours axis with light grid lines, one column per quadrant
 * (its height the hours a day it takes), the hours on top of each column and its name and number of
 * tasks under it. Tapping a column shows which tasks are in it. `items` is the routine as it is now.
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

  const toggle = (k) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === k ? null : k));
  };

  return (
    <View style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>Where your time goes</Text>
        <Text style={styles.total}>{formatHours(total)} a day</Text>
      </View>
      <Card style={styles.card}>
        <Text style={styles.unit}>hours a day</Text>
        <View style={styles.chart}>
          {/* The hours axis: labels on the left, light grid lines across. */}
          {ticks.map((v) => (
            <View key={v} pointerEvents="none" style={[styles.gridRow, { top: yOf(v) - 7 }]}>
              <Text style={styles.tick}>{v}</Text>
              <View style={[styles.gridLine, v === 0 && styles.baseline]} />
            </View>
          ))}

          {/* The columns: one per quadrant, hours on top. */}
          <View style={styles.columns}>
            {ORDER.map((k) => {
              const hours = hoursOf(k);
              const h = (hours / top) * PLOT;
              const on = open === k;
              return (
                <Pressable
                  key={k}
                  onPress={() => toggle(k)}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: on }}
                  accessibilityLabel={`${DRIP[k].name}: ${formatHours(hours)} a day, ${by[k].length} tasks. Tap to see them.`}
                  style={styles.slot}
                >
                  <Text style={[styles.barValue, { marginBottom: 4 }]}>{hours ? formatHours(hours) : '0h'}</Text>
                  <View style={[styles.bar, { height: Math.max(hours ? 4 : 0, h), backgroundColor: colors.chart[k] }, on && styles.barOn]} />
                </Pressable>
              );
            })}
          </View>
        </View>

        {/* Names and task counts under the columns. */}
        <View style={styles.xLabels}>
          {ORDER.map((k) => (
            <Pressable key={k} onPress={() => toggle(k)} style={styles.xLabel} accessibilityElementsHidden>
              <Text style={[styles.xName, open === k && styles.xNameOn]} numberOfLines={1} adjustsFontSizeToFit>
                {DRIP[k].name}
              </Text>
              <Text style={styles.xCount}>
                {by[k].length} {by[k].length === 1 ? 'task' : 'tasks'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* The tapped column's tasks. */}
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
      </Card>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  total: { fontSize: 13, fontWeight: '700', color: colors.muted },
  card: { paddingVertical: spacing.md },
  unit: { fontSize: 11, fontWeight: '700', color: colors.muted, marginBottom: spacing.sm },
  // The plot: grid rows behind, columns in front.
  chart: { height: PLOT, marginTop: 4 },
  gridRow: { position: 'absolute', left: 0, right: 0, height: 14, flexDirection: 'row', alignItems: 'center' },
  tick: { width: AXIS - 6, textAlign: 'right', marginRight: 6, fontSize: 10, fontWeight: '600', color: colors.muted },
  gridLine: { flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.6 },
  baseline: { opacity: 1, height: 1.5 },
  columns: { position: 'absolute', left: AXIS, right: 0, top: 0, bottom: 0, flexDirection: 'row' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '52%', maxWidth: 46, borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  barOn: { borderWidth: 2, borderColor: colors.text, borderBottomWidth: 0 },
  barValue: { fontSize: 12, fontWeight: '800', color: colors.text },
  xLabels: { flexDirection: 'row', marginLeft: AXIS, marginTop: 6 },
  xLabel: { flex: 1, alignItems: 'center', paddingHorizontal: 2 },
  xName: { fontSize: 11, fontWeight: '700', color: colors.text },
  xNameOn: { fontWeight: '800', textDecorationLine: 'underline' },
  xCount: { fontSize: 10, fontWeight: '600', color: colors.muted, marginTop: 1 },
  hint: { fontSize: 12, color: colors.muted, textAlign: 'center', marginTop: spacing.sm + 2 },
  tasks: { flexDirection: 'row', gap: 6, marginTop: spacing.sm + 2, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  key: { width: 10, height: 10, borderRadius: 3, marginTop: 4 },
  tasksText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  tasksName: { fontWeight: '800' },
});
