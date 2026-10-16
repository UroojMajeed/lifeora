import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

// The four quadrants in the book's order of value, each in its fixed chart colour.
const ORDER = ['production', 'replacement', 'investment', 'delegation'];

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });

/**
 * Where your time goes, as a bar chart: one bar per quadrant, its length the hours a day it takes
 * (against your biggest), labelled right on it with its name, hours and number of tasks. Tapping a bar
 * shows which tasks are in it. `items` is the routine as it is now.
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
  const max = Math.max(...ORDER.map(hoursOf), 0.0001);

  return (
    <View style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>Where your time goes</Text>
        <Text style={styles.total}>{formatHours(total)} a day</Text>
      </View>
      <Card style={styles.card}>
        {ORDER.map((k, i) => {
          const q = DRIP[k];
          const hours = hoursOf(k);
          const tasks = by[k];
          const isOpen = open === k;
          return (
            <Pressable
              key={k}
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setOpen(isOpen ? null : k);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: isOpen }}
              accessibilityLabel={`${q.name}: ${formatHours(hours)} a day, ${tasks.length} ${tasks.length === 1 ? 'task' : 'tasks'}. Tap to see them.`}
              style={[styles.row, i > 0 && styles.rowGap]}
            >
              {/* The name and the numbers, in text colours; the bar under them carries the colour. */}
              <View style={styles.labels}>
                <View style={[styles.key, { backgroundColor: colors.chart[k] }]} />
                <Text style={styles.name}>{q.name}</Text>
                <Text style={styles.value}>
                  {formatHours(hours)} <Text style={styles.count}>· {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}</Text>
                </Text>
                <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
              </View>
              <View style={styles.track}>
                {hours ? <View style={[styles.bar, { width: `${(hours / max) * 100}%`, backgroundColor: colors.chart[k] }]} /> : null}
              </View>
              {isOpen ? (
                <Text style={styles.tasks}>{tasks.length ? tasks.map((t) => `${t.activity} (${formatHours(t.hours)})`).join(' · ') : 'No tasks here.'}</Text>
              ) : null}
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  total: { fontSize: 13, fontWeight: '700', color: colors.muted },
  card: { paddingVertical: spacing.md + 2 },
  row: {},
  rowGap: { marginTop: spacing.md },
  labels: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  key: { width: 10, height: 10, borderRadius: 3 },
  name: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text },
  value: { fontSize: 14, fontWeight: '800', color: colors.text },
  count: { fontSize: 13, fontWeight: '600', color: colors.muted },
  // A recessive track, the bar on it with rounded ends.
  track: { height: 12, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  bar: { height: 12, borderRadius: 4 },
  tasks: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 6 },
});
