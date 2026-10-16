import { Pressable, Text, View } from 'react-native';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// The book's four quadrants, best first, each with what it means in a few words.
const ORDER = [
  { key: 'production', meaning: 'Your best work' },
  { key: 'replacement', meaning: 'Pays, but drains you' },
  { key: 'investment', meaning: 'Pays you later' },
  { key: 'delegation', meaning: 'Hand these off first' },
];

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });

/**
 * Home's first look at your routine, as stats instead of a matrix: one bar of your day split by
 * quadrant, then a tile per quadrant with its share of the day, its hours and tasks, what it means
 * in a few words, and which tasks live there. `items` is the routine as it is now. Tapping a tile
 * calls `onOpen` (your routine).
 */
export default function RoutineStats({ items = [], onOpen, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const rated = items.filter((it) => it.energy && it.hours);
  const total = rated.reduce((t, it) => t + it.hours, 0);
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantOf(it)]?.push(it));
  const hoursOf = (k) => by[k].reduce((t, it) => t + it.hours, 0);
  const pct = (k) => (total ? Math.round((hoursOf(k) / total) * 100) : 0);

  return (
    <View style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>Your routine</Text>
        <Text style={styles.total}>
          {formatHours(total)} a day · {rated.length} {rated.length === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      {/* Your day in one bar, split by quadrant. */}
      <View style={styles.bar} accessible accessibilityLabel={`Your day: ${ORDER.map((o) => `${DRIP[o.key].name} ${pct(o.key)}%`).join(', ')}`}>
        {ORDER.filter((o) => hoursOf(o.key)).map((o) => (
          <View key={o.key} style={[styles.segment, { flex: hoursOf(o.key), backgroundColor: colors[DRIP[o.key].color] }]} />
        ))}
      </View>

      {/* A tile per quadrant: share, hours, what it means, and its tasks. */}
      <View style={styles.grid}>
        {ORDER.map((o) => {
          const q = DRIP[o.key];
          const tasks = by[o.key];
          return (
            <Pressable
              key={o.key}
              onPress={onOpen}
              accessibilityRole="button"
              accessibilityLabel={`${q.name}: ${pct(o.key)}% of your day, ${formatHours(hoursOf(o.key))}. ${o.meaning}. ${tasks.map((t) => t.activity).join(', ')}`}
              style={({ pressed }) => [styles.tile, { backgroundColor: colors[q.soft] }, pressed && { opacity: 0.85 }]}
            >
              <View style={styles.tileTop}>
                <Text style={[styles.name, { color: colors[q.color] }]} numberOfLines={1}>
                  {q.name}
                </Text>
                <Text style={[styles.pct, { color: colors[q.color] }]}>{pct(o.key)}%</Text>
              </View>
              <Text style={styles.meta}>
                {formatHours(hoursOf(o.key))} · {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
              </Text>
              <Text style={styles.meaning}>{o.meaning}</Text>
              <Text style={styles.tasks} numberOfLines={2}>
                {tasks.length ? tasks.map((t) => t.activity).join(', ') : 'Nothing here'}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  total: { fontSize: 13, fontWeight: '700', color: colors.muted },
  bar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2, backgroundColor: colors.border },
  segment: { height: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  tile: { width: '48.5%', flexGrow: 1, padding: spacing.sm + 4, borderRadius: radius.md, minHeight: 118 },
  tileTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 },
  name: { flexShrink: 1, fontSize: 11, fontWeight: '800', letterSpacing: 0.8, textTransform: 'uppercase' },
  pct: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  meta: { fontSize: 13, fontWeight: '700', color: colors.text },
  meaning: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 2 },
  tasks: { fontSize: 12, lineHeight: 16, color: colors.text, marginTop: spacing.sm },
});
