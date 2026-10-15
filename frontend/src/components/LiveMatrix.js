import { Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// The book's layout: the money-making quadrants on top, the energizing ones on the right.
const LAYOUT = [
  ['replacement', 'production'],
  ['delegation', 'investment'],
];

const dotSize = (hours) => Math.max(10, Math.min(22, 8 + hours * 4));

/**
 * A compact DRIP Matrix that builds while you audit: each finished task drops into its quadrant as a
 * dot (bigger = more hours a day). `items` are the tasks; only finished ones show.
 */
export default function LiveMatrix({ items = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  items
    .filter((it) => it.hours && it.money && it.energy)
    .forEach((it) => by[quadrantFor({ value: valueForMoney(it.money), energy: it.energy })].push(it));

  return (
    <View style={[styles.grid, style]}>
      {LAYOUT.map((row) => (
        <View key={row[0]} style={styles.row}>
          {row.map((key) => {
            const q = DRIP[key];
            const tasks = by[key];
            const hours = tasks.reduce((t, it) => t + it.hours, 0);
            return (
              <View
                key={key}
                style={[styles.box, { backgroundColor: colors[q.soft] }]}
                accessible
                accessibilityLabel={`${q.name}: ${tasks.length ? tasks.map((t) => t.activity).join(', ') : 'nothing yet'}`}
              >
                <View style={styles.head}>
                  <Text style={[styles.name, { color: colors[q.color] }]} numberOfLines={1}>
                    {q.name}
                  </Text>
                  {hours ? <Text style={[styles.hours, { color: colors[q.color] }]}>{formatHours(hours)}</Text> : null}
                </View>
                {/* The dots: each finished task drops in from above. */}
                <View style={styles.dots}>
                  {tasks.map((it) => {
                    const size = dotSize(it.hours);
                    return (
                      <Animated.View
                        key={it.activity}
                        entering={FadeInDown.duration(450)}
                        style={[styles.dot, { width: size, height: size, borderRadius: size / 2, backgroundColor: colors[q.color] }]}
                      />
                    );
                  })}
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
  box: { flex: 1, minHeight: 72, padding: spacing.sm, borderRadius: radius.md },
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 4 },
  name: { flexShrink: 1, fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  hours: { fontSize: 10, fontWeight: '800' },
  dots: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', alignContent: 'center', gap: 6, marginTop: 6 },
  dot: { borderWidth: 2, borderColor: colors.surface },
});
