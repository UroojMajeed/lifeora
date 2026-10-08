import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// The book's layout: the money-making quadrants on top, the energizing ones on the right.
const LAYOUT = [
  ['replacement', 'production'],
  ['delegation', 'investment'],
];

const quadrantOf = (it) => quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });

/**
 * The DRIP Matrix as four boxes that fill up while you rate: each rated task sits as a chip in its
 * quadrant. `latest` gets an outline (the one just rated); tapping a chip re-opens it (`onSelect`).
 */
export default function QuadrantBoard({ items, latest, selected, onSelect, registerBox }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const rated = items.filter((it) => it.energy && (it.money || it.value));
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantOf(it)].push(it));

  return (
    <View style={styles.grid}>
      {LAYOUT.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((key) => {
            const q = DRIP[key];
            const tasks = by[key];
            const hours = tasks.reduce((t, it) => t + it.hours, 0);
            return (
              <View
                key={key}
                ref={(node) => registerBox?.(key, node)}
                collapsable={false}
                style={[styles.box, { backgroundColor: colors[q.soft] }]}
              >
                <View style={styles.head}>
                  <Text style={[styles.name, { color: colors[q.color] }]} numberOfLines={1}>
                    {q.name}
                  </Text>
                  {hours ? <Text style={[styles.hours, { color: colors[q.color] }]}>{formatHours(hours)}</Text> : null}
                </View>
                <View style={styles.chips}>
                  {tasks.length ? (
                    tasks.map((it) => {
                      const outlined = it.activity === latest || it.activity === selected;
                      return (
                        <Animated.View key={it.activity} entering={FadeIn.duration(250)}>
                          <Pressable
                            onPress={() => onSelect?.(it.activity)}
                            accessibilityRole="button"
                            accessibilityLabel={`${it.activity}, ${q.name}. Tap to change.`}
                            style={[styles.chip, outlined && { borderColor: colors[q.color] }]}
                          >
                            <Text style={styles.chipText} numberOfLines={1}>
                              {it.activity}
                            </Text>
                          </Pressable>
                        </Animated.View>
                      );
                    })
                  ) : (
                    <Text style={styles.empty}>{q.axes}</Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors) => ({
  grid: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  box: { flex: 1, minHeight: 104, padding: spacing.sm + 2, borderRadius: radius.md },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 },
  name: { flexShrink: 1, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  hours: { fontSize: 12, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  chip: {
    maxWidth: 140,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: 'transparent',
    backgroundColor: colors.surface,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
  empty: { fontSize: 12, lineHeight: 16, color: colors.muted },
});
