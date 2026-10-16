import { Pressable, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { MONEY_SPLIT } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

const RING = 104;
const STROKE = 12;
const R = (RING - STROKE) / 2;
const C = 2 * Math.PI * R;

// Does a task make money? (a $ rating of $$$ and up, or the older "high value").
const makesMoney = (it) => (it.money ? it.money >= MONEY_SPLIT : it.value === 'high');

/**
 * Home's first look at your routine, in plain stats: a ring of how much of your day drains you,
 * the hours that energize you and that drain you, how much of your day makes money, and your
 * biggest drain. `items` is the routine as it is now. Tapping opens your routine (`onOpen`).
 */
export default function RoutineStats({ items = [], onOpen, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const rated = items.filter((it) => it.energy && it.hours);
  const sum = (list) => list.reduce((t, it) => t + it.hours, 0);
  const total = sum(rated);
  const draining = rated.filter((it) => it.energy === 'draining');
  const drainHours = sum(draining);
  const energyHours = total - drainHours;
  const moneyHours = sum(rated.filter(makesMoney));
  const drainShare = total ? drainHours / total : 0;
  const biggest = [...draining].sort((a, b) => b.hours - a.hours)[0];

  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={style} accessibilityLabel="Your routine. Open it.">
      <View style={styles.head}>
        <Text style={styles.title}>Your routine</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.muted} />
      </View>
      <Card style={styles.card}>
        <View style={styles.top}>
          {/* How much of your day drains you, as a ring. */}
          <View style={styles.ring} accessible accessibilityLabel={`${Math.round(drainShare * 100)}% of your day drains you`}>
            <Svg width={RING} height={RING} style={{ position: 'absolute' }}>
              <Circle cx={RING / 2} cy={RING / 2} r={R} stroke={colors.successSoft} strokeWidth={STROKE} fill="none" />
              {drainShare ? (
                <Circle
                  cx={RING / 2}
                  cy={RING / 2}
                  r={R}
                  stroke={colors.error}
                  strokeWidth={STROKE}
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${C * drainShare} ${C}`}
                  rotation={-90}
                  origin={`${RING / 2}, ${RING / 2}`}
                />
              ) : null}
            </Svg>
            <Text style={styles.ringPct}>{Math.round(drainShare * 100)}%</Text>
            <Text style={styles.ringLabel}>drains you</Text>
          </View>

          {/* Your day in hours: energizing and draining. */}
          <View style={styles.facts}>
            <Text style={styles.total}>
              {formatHours(total)} a day · {rated.length} {rated.length === 1 ? 'task' : 'tasks'}
            </Text>
            <View style={styles.fact}>
              <Ionicons name="flash" size={15} color={colors.success} />
              <Text style={styles.factLabel}>Energizes you</Text>
              <Text style={[styles.factValue, { color: colors.success }]}>{formatHours(energyHours)}</Text>
            </View>
            <View style={styles.fact}>
              <Ionicons name="battery-dead" size={15} color={colors.error} />
              <Text style={styles.factLabel}>Drains you</Text>
              <Text style={[styles.factValue, { color: colors.error }]}>{formatHours(drainHours)}</Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        {/* How much of your day makes money. */}
        <View style={styles.row}>
          <Ionicons name="cash-outline" size={15} color={colors.accentText} />
          <Text style={styles.rowLabel}>Makes money</Text>
          <View style={styles.track}>
            <View style={[styles.fill, { flex: moneyHours || 0.0001, backgroundColor: colors.gold[1] }]} />
            <View style={{ flex: Math.max(0.0001, total - moneyHours) }} />
          </View>
          <Text style={styles.rowValue}>
            {formatHours(moneyHours)} of {formatHours(total)}
          </Text>
        </View>

        {/* Your biggest drain: the first thing worth handing off. */}
        {biggest ? (
          <View style={[styles.row, styles.rowGap]}>
            <Ionicons name="battery-dead" size={15} color={colors.error} />
            <Text style={styles.rowLabel}>Biggest drain</Text>
            <Text style={styles.biggest} numberOfLines={1}>
              {biggest.activity} · {formatHours(biggest.hours)}
            </Text>
          </View>
        ) : null}
      </Card>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  card: { paddingVertical: spacing.md + 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.md + 2 },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  ringPct: { fontSize: 24, lineHeight: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  ringLabel: { fontSize: 11, fontWeight: '700', color: colors.muted },
  facts: { flex: 1, gap: spacing.sm },
  total: { fontSize: 15, fontWeight: '800', color: colors.text },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  factLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  factValue: { fontSize: 15, fontWeight: '800' },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowGap: { marginTop: spacing.sm + 2 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  track: { flex: 1, flexDirection: 'row', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: colors.accentSoft, marginHorizontal: 4 },
  fill: { height: 8, borderRadius: 4 },
  rowValue: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  biggest: { flex: 1, textAlign: 'right', fontSize: 13, fontWeight: '800', color: colors.text },
});
