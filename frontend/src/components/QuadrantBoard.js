import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// The book's layout: the money-making quadrants on top, the energizing ones on the right.
const LAYOUT = [
  ['replacement', 'production'],
  ['delegation', 'investment'],
];

const Y_AXIS = 26;

const quadrantOf = (it) => quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });

/**
 * The DRIP Matrix as one box split into four sections, with the money axis up the left and the energy
 * axis along the bottom (like the book's graph). Each rated task sits as a chip in its section.
 * `latest` gets an outline (the one just rated); tapping a chip re-opens it (`onSelect`).
 */
export default function QuadrantBoard({ items, latest, selected, onSelect, registerBox }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const rated = items.filter((it) => it.energy && (it.money || it.value));
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantOf(it)].push(it));

  return (
    <View>
      <View style={styles.graph}>
        {/* Money axis: an arrow up the left side */}
        <View style={styles.yAxis}>
          <View style={styles.yLine} />
          <Ionicons name="caret-up" size={14} color={colors.muted} style={styles.yArrowHead} />
          <Text style={[styles.yEnd, styles.yTop]}>$$$</Text>
          <Text style={styles.yWord}>MONEY</Text>
          <Text style={[styles.yEnd, styles.yBottom]}>$</Text>
        </View>

        {/* One box, divided into the four quadrants */}
        <View style={styles.box}>
          {LAYOUT.map((row, r) => (
            <View key={row[0]} style={[styles.row, r === 0 && styles.rowTop]}>
              {row.map((key, c) => {
                const q = DRIP[key];
                const tasks = by[key];
                const hours = tasks.reduce((t, it) => t + it.hours, 0);
                return (
                  <View
                    key={key}
                    ref={(node) => registerBox?.(key, node)}
                    collapsable={false}
                    style={[styles.section, c === 0 && styles.sectionLeft, { backgroundColor: colors[q.soft] }]}
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
      </View>

      {/* Energy axis: an arrow along the bottom */}
      <View style={styles.xAxis}>
        <View style={styles.xLineRow}>
          <View style={styles.xLine} />
          <Ionicons name="caret-forward" size={14} color={colors.muted} style={styles.xArrowHead} />
        </View>
        <View style={styles.xLabels}>
          <Text style={styles.xLabel}>Drains you</Text>
          <Text style={styles.xWord}>ENERGY</Text>
          <Text style={styles.xLabel}>Energizes you</Text>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors) => ({
  graph: { flexDirection: 'row' },
  yAxis: { width: Y_AXIS, alignItems: 'center', marginRight: 6 },
  yLine: { position: 'absolute', top: 6, bottom: 0, width: 2, borderRadius: 1, backgroundColor: colors.border },
  yArrowHead: { position: 'absolute', top: -4 },
  yEnd: { position: 'absolute', fontSize: 10, fontWeight: '800', backgroundColor: colors.background },
  yTop: { top: 14, color: colors.text },
  yBottom: { bottom: 4, color: colors.muted },
  yWord: {
    position: 'absolute',
    top: '50%',
    width: 60,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.muted,
    backgroundColor: colors.background,
    transform: [{ translateY: -6 }, { rotate: '-90deg' }],
  },
  // A single rounded box; thin lines split it into the four quadrants.
  box: { flex: 1, borderRadius: radius.md, overflow: 'hidden', borderWidth: 1.5, borderColor: colors.border },
  row: { flexDirection: 'row' },
  rowTop: { borderBottomWidth: 1.5, borderBottomColor: colors.border },
  section: { flex: 1, minHeight: 96, padding: spacing.sm + 2 },
  sectionLeft: { borderRightWidth: 1.5, borderRightColor: colors.border },
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
  xAxis: { marginLeft: Y_AXIS + 6, marginTop: 6 },
  xLineRow: { flexDirection: 'row', alignItems: 'center' },
  xLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border },
  xArrowHead: { marginLeft: -4 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  xLabel: { fontSize: 10, fontWeight: '700', color: colors.muted },
  xWord: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.muted },
});
