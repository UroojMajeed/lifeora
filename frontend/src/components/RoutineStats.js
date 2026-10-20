import { useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withTiming, ZoomIn } from 'react-native-reanimated';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

// Energizing quadrants first, then the two that drain you, so the day reads "gives energy → drains".
const ORDER = ['production', 'investment', 'replacement', 'delegation'];
const DRAINS = new Set(['replacement', 'delegation']);
const COLS = 10; // blocks per row
const GAP = 5;
const BLOCK_HOURS = 0.5; // each block is half an hour

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });
const h = (n) => `${Math.round(n * 10) / 10} h`;

/** One half-hour of the day: pops in on arrival, and dims when another quadrant is picked. */
function Block({ color, size, index, dim }) {
  const opacity = useSharedValue(1);
  useEffect(() => {
    opacity.value = withTiming(dim ? 0.18 : 1, { duration: 250 });
  }, [dim, opacity]);
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <Animated.View entering={ZoomIn.duration(280).delay(120 + index * 22)}>
      <Animated.View style={[{ width: size, height: size, borderRadius: size * 0.3, backgroundColor: color }, fade]} />
    </Animated.View>
  );
}

/**
 * Home's first look on a first visit: your whole routine as half-hour blocks, coloured by quadrant
 * (energizing first, then what drains you), and the four quadrants with their hours and share of
 * the day. Tap a quadrant: its blocks stay lit and its tasks show. `items` is the routine as it is now.
 */
export default function RoutineStats({ items = [], buybackRate, currency = 'USD', style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(null);
  const [width, setWidth] = useState(0);

  const rated = items.filter((it) => it.energy && it.hours);
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantOf(it)]?.push(it));
  const hoursOf = (k) => by[k].reduce((t, it) => t + it.hours, 0);
  const total = ORDER.reduce((t, k) => t + hoursOf(k), 0);
  const share = (k) => (total ? Math.round((hoursOf(k) / total) * 100) : 0);
  const drainHours = hoursOf('replacement') + hoursOf('delegation');
  const costWeek = buybackRate ? drainHours * WORKDAYS_PER_WEEK * buybackRate : 0;

  // The day in half-hour blocks, quadrant by quadrant (anything above zero shows at least one block).
  const blocks = [];
  ORDER.forEach((k) => {
    const hours = hoursOf(k);
    const n = hours ? Math.max(1, Math.round(hours / BLOCK_HOURS)) : 0;
    for (let i = 0; i < n; i += 1) blocks.push(k);
  });
  const size = width ? (width - GAP * (COLS - 1)) / COLS : 0;

  const pick = (k) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === k ? null : k));
  };

  return (
    <View style={[styles.card, style]}>
      <View style={styles.head}>
        <Text style={styles.title}>Your routine</Text>
        <Text style={styles.total}>
          {h(total)} a day · {rated.length} {rated.length === 1 ? 'task' : 'tasks'}
        </Text>
      </View>

      {/* The whole day, one block per half hour. */}
      <View
        style={styles.blocks}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        accessible
        accessibilityLabel={`Your day: ${ORDER.map((k) => `${DRIP[k].name} ${share(k)}%`).join(', ')}.`}
      >
        {size
          ? blocks.map((k, i) => <Block key={i} index={i} size={size} color={colors.chart[k]} dim={open !== null && open !== k} />)
          : null}
      </View>
      <Text style={styles.scale}>Each block is half an hour</Text>

      {/* The four quadrants: hours and share of the day. Tap one to light up its blocks and see its tasks. */}
      <View style={styles.grid}>
        {ORDER.map((k) => {
          const on = open === k;
          return (
            <Pressable
              key={k}
              onPress={() => pick(k)}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${DRIP[k].name}: ${formatHours(hoursOf(k))} a day, ${share(k)}% of your day${DRAINS.has(k) ? ', drains you' : ''}.`}
              style={({ pressed }) => [styles.cell, on && { borderColor: colors.chart[k] }, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.cellHead}>
                <View style={[styles.key, { backgroundColor: colors.chart[k] }]} />
                <Text style={styles.cellName} numberOfLines={1}>
                  {DRIP[k].name}
                </Text>
              </View>
              <Text style={styles.pct}>
                {share(k)}
                <Text style={styles.pctSign}>%</Text>
              </Text>
              <Text style={styles.cellSub}>
                {h(hoursOf(k))} · {DRAINS.has(k) ? <Text style={styles.drains}>drains</Text> : 'energizes'}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {open ? (
        <Animated.View key={open} entering={FadeIn.duration(250)} style={styles.tasks}>
          {by[open].length ? (
            by[open]
              .sort((a, b) => b.hours - a.hours)
              .map((t) => (
                <View key={t.activity} style={styles.chip}>
                  <View style={[styles.chipDot, { backgroundColor: colors.chart[open] }]} />
                  <Text style={styles.chipText} numberOfLines={1}>
                    {t.activity} <Text style={styles.chipHours}>{formatHours(t.hours)}</Text>
                  </Text>
                </View>
              ))
          ) : (
            <Text style={styles.empty}>No tasks here yet.</Text>
          )}
        </Animated.View>
      ) : drainHours ? (
        <Text style={styles.insight}>
          <Text style={styles.insightStrong}>{Math.round((drainHours / total) * 100)}% of your day drains you</Text>
          {costWeek ? `, worth ${formatMoney(costWeek, currency, { decimals: 0 })} a week at your rate.` : '.'} Tap a quadrant to see its tasks.
        </Text>
      ) : (
        <Text style={styles.insight}>Tap a quadrant to see its tasks.</Text>
      )}
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
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  total: { fontSize: 12, fontWeight: '600', color: colors.muted },
  blocks: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, marginTop: spacing.md, minHeight: 24 },
  scale: { fontSize: 10, color: colors.muted, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  cell: {
    width: '47%',
    flexGrow: 1,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  cellHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  key: { width: 8, height: 8, borderRadius: 2 },
  cellName: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.text },
  pct: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.8, marginTop: 4 },
  pctSign: { fontSize: 15, fontWeight: '700', color: colors.muted },
  cellSub: { fontSize: 12, fontWeight: '600', color: colors.muted },
  drains: { color: colors.error, fontWeight: '700' },
  tasks: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.md },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, backgroundColor: colors.surfaceAlt },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { flexShrink: 1, fontSize: 13, fontWeight: '600', color: colors.text },
  chipHours: { fontWeight: '500', color: colors.muted },
  empty: { fontSize: 13, color: colors.muted },
  insight: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: spacing.md },
  insightStrong: { fontWeight: '800', color: colors.text },
});
