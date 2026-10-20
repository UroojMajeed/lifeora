import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const ORDER = ['production', 'replacement', 'investment', 'delegation'];
const SHOWN = 5; // tasks shown before "Show all"

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });
const h = (n) => `${Math.round(n * 10) / 10} h`;

/**
 * Home's first look on a first visit: your routine. Two headline numbers (how much drains you a day,
 * and what that costs a week at your Buyback Rate), then every task as a bar, longest first, coloured
 * by its quadrant, so the biggest drains stand out. `items` is the routine as it is now.
 */
export default function RoutineStats({ items = [], buybackRate, currency = 'USD', style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [all, setAll] = useState(false);

  const rated = items
    .filter((it) => it.energy && it.hours)
    .map((it) => ({ ...it, q: quadrantOf(it) }))
    .sort((a, b) => b.hours - a.hours);
  const total = rated.reduce((t, it) => t + it.hours, 0);
  const drainHours = rated.filter((it) => it.energy === 'draining').reduce((t, it) => t + it.hours, 0);
  const costWeek = buybackRate ? drainHours * WORKDAYS_PER_WEEK * buybackRate : 0;
  const max = rated[0]?.hours || 1;
  const shown = all ? rated : rated.slice(0, SHOWN);
  const used = ORDER.filter((k) => rated.some((it) => it.q === k));

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAll((v) => !v);
  };

  return (
    <View style={[styles.card, style]}>
      {/* The two numbers that matter. */}
      <View style={styles.tiles}>
        <View style={[styles.tile, styles.tileDrain]}>
          <View style={styles.tileHead}>
            <Ionicons name="battery-dead-outline" size={14} color={colors.error} />
            <Text style={[styles.tileLabel, { color: colors.error }]}>Drains you</Text>
          </View>
          <Text style={styles.tileValue}>
            {h(drainHours)}
            <Text style={styles.tileUnit}> a day</Text>
          </Text>
        </View>
        <View style={[styles.tile, styles.tileCost]}>
          <View style={styles.tileHead}>
            <Ionicons name="wallet-outline" size={14} color={colors.accentText} />
            <Text style={[styles.tileLabel, { color: colors.accentText }]}>It costs you</Text>
          </View>
          <Text style={styles.tileValue} numberOfLines={1} adjustsFontSizeToFit>
            {costWeek ? formatMoney(costWeek, currency, { decimals: 0 }) : '–'}
            <Text style={styles.tileUnit}> a week</Text>
          </Text>
        </View>
      </View>

      {/* Every task, longest first. */}
      <View style={styles.head}>
        <Text style={styles.title}>Your routine</Text>
        <Text style={styles.total}>
          {h(total)} a day · {rated.length} {rated.length === 1 ? 'task' : 'tasks'}
        </Text>
      </View>
      <View style={styles.rows}>
        {shown.map((it) => {
          const drains = it.energy === 'draining';
          return (
            <View
              key={it.activity}
              accessible
              accessibilityLabel={`${it.activity}: ${formatHours(it.hours)} a day, ${DRIP[it.q].name}${drains ? ', drains you' : ''}.`}
            >
              <View style={styles.rowTop}>
                <Text style={styles.name} numberOfLines={1}>
                  {it.activity}
                </Text>
                {drains ? <Text style={styles.drains}>drains</Text> : null}
                <Text style={styles.hours}>{formatHours(it.hours)}</Text>
              </View>
              <View style={styles.track}>
                <View style={[styles.bar, { width: `${(it.hours / max) * 100}%`, backgroundColor: colors.chart[it.q] }]} />
              </View>
            </View>
          );
        })}
      </View>

      {rated.length > SHOWN ? (
        <Pressable onPress={toggle} hitSlop={8} accessibilityRole="button" style={styles.more}>
          <Text style={styles.moreText}>{all ? 'Show less' : `Show all ${rated.length}`}</Text>
          <Ionicons name={all ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
        </Pressable>
      ) : null}

      {/* The colour key. */}
      <View style={styles.legend}>
        {used.map((k) => (
          <View key={k} style={styles.legendItem}>
            <View style={[styles.key, { backgroundColor: colors.chart[k] }]} />
            <Text style={styles.legendText}>{DRIP[k].name}</Text>
          </View>
        ))}
      </View>
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
  // Headline tiles
  tiles: { flexDirection: 'row', gap: spacing.sm },
  tile: { flex: 1, borderRadius: radius.md, padding: spacing.sm + 4 },
  tileDrain: { backgroundColor: colors.errorSoft },
  tileCost: { backgroundColor: colors.accentSoft },
  tileHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tileLabel: { fontSize: 12, fontWeight: '700' },
  tileValue: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginTop: 6 },
  tileUnit: { fontSize: 13, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  // Task bars
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.lg, marginBottom: spacing.sm + 2 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text },
  total: { fontSize: 12, fontWeight: '600', color: colors.muted },
  rows: { gap: spacing.sm + 4 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5 },
  name: { flexShrink: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  drains: { fontSize: 10, fontWeight: '700', color: colors.error, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 6, backgroundColor: colors.errorSoft, overflow: 'hidden' },
  hours: { marginLeft: 'auto', fontSize: 13, fontWeight: '800', color: colors.text },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.md },
  moreText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  legend: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.md, marginTop: spacing.md, paddingTop: spacing.sm + 2, borderTopWidth: 1, borderTopColor: colors.border },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  key: { width: 8, height: 8, borderRadius: 2 },
  legendText: { fontSize: 11, fontWeight: '600', color: colors.muted },
});
