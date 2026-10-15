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

/**
 * A compact DRIP Matrix that builds while you audit: each finished task drops into its quadrant as a
 * small chip (tap it to change the task). `items` are the tasks; only finished ones show.
 */
export default function LiveMatrix({ items = [], onSelect, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  items
    .filter((it) => it.hours && it.money && it.energy)
    .forEach((it) => by[quadrantFor({ value: valueForMoney(it.money), energy: it.energy })].push(it));

  return (
    <View style={[styles.grid, style]} accessibilityLabel="Your DRIP Matrix, building as you audit">
      {LAYOUT.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((key) => {
            const q = DRIP[key];
            const tasks = by[key];
            const hours = tasks.reduce((t, it) => t + it.hours, 0);
            return (
              <View key={key} style={[styles.box, { backgroundColor: colors[q.soft] }]}>
                <View style={styles.head}>
                  <Text style={[styles.name, { color: colors[q.color] }]} numberOfLines={1}>
                    {q.name}
                  </Text>
                  {hours ? <Text style={[styles.hours, { color: colors[q.color] }]}>{formatHours(hours)}</Text> : null}
                </View>
                <View style={styles.chips}>
                  {tasks.map((it) => (
                    <Animated.View key={it.activity} entering={FadeIn.duration(250)}>
                      <Pressable
                        onPress={() => onSelect?.(it.activity)}
                        accessibilityRole="button"
                        accessibilityLabel={`${it.activity}, ${q.name}. Tap to change.`}
                        style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
                      >
                        <Text style={styles.chipText} numberOfLines={1}>
                          {it.activity}
                        </Text>
                      </Pressable>
                    </Animated.View>
                  ))}
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
  grid: { gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  box: { flex: 1, minHeight: 64, padding: spacing.sm, borderRadius: radius.md },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 },
  name: { flexShrink: 1, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  hours: { fontSize: 10, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: { maxWidth: 130, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, backgroundColor: colors.surface },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.text },
});
