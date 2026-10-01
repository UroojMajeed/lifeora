import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { DRIP, DRIP_GRID } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const ORDER = ['replacement', 'production', 'delegation', 'investment'];

/**
 * 2x2 DRIP Matrix: money on the vertical axis, energy on the horizontal.
 * `compact` hides task names; `animate` pops the quadrants in one by one.
 */
export default function DripMatrix({ summary, compact = false, animate = false }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { hours, tasks, totalHours, dominant } = summary;
  const anims = useRef(ORDER.map(() => new Animated.Value(animate ? 0 : 1))).current;

  useEffect(() => {
    if (!animate) return;
    Animated.stagger(
      140,
      anims.map((v) => Animated.spring(v, { toValue: 1, friction: 7, tension: 60, useNativeDriver: true }))
    ).start();
  }, [animate, anims]);

  return (
    <View>
      <View style={styles.colHeaders}>
        <Text style={styles.axis}>Drains you</Text>
        <Text style={styles.axis}>Energizes you</Text>
      </View>

      {DRIP_GRID.map((row, r) => (
        <View key={r} style={styles.row}>
          {row.map((key) => {
            const q = DRIP[key];
            const isDominant = key === dominant;
            const pct = totalHours ? Math.round((hours[key] / totalHours) * 100) : 0;
            const anim = anims[ORDER.indexOf(key)];
            return (
              <Animated.View
                key={key}
                style={[
                  styles.cell,
                  { backgroundColor: colors[q.soft], borderColor: isDominant ? colors[q.color] : 'transparent' },
                  { opacity: anim, transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }] },
                ]}
                accessible
                accessibilityLabel={`${q.name}: ${formatHours(hours[key])}, ${pct} percent of your day`}
              >
                <View style={styles.nameRow}>
                  <View style={[styles.dot, { backgroundColor: colors[q.color] }]} />
                  <Text style={[styles.name, { color: colors[q.color] }]}>{q.name}</Text>
                </View>
                <Text style={styles.hours}>{formatHours(hours[key])}</Text>
                <View style={styles.track}>
                  <View style={[styles.fill, { width: `${pct}%`, backgroundColor: colors[q.color] }]} />
                </View>
                <Text style={styles.pct}>{pct}% of your day</Text>
                {!compact && tasks[key].length ? (
                  <Text style={styles.tasks} numberOfLines={4}>
                    {tasks[key].map((t) => t.activity).join('\n')}
                  </Text>
                ) : null}
                {isDominant ? (
                  <Text style={[styles.badge, { backgroundColor: colors[q.color] }]}>You live here</Text>
                ) : null}
              </Animated.View>
            );
          })}
        </View>
      ))}

      <Text style={styles.axisSmall}>Top row makes money · Bottom row doesn't</Text>
    </View>
  );
}

const makeStyles = (colors) => ({
  colHeaders: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  axis: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    color: colors.muted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  row: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  cell: { flex: 1, minHeight: 132, padding: spacing.md, borderRadius: radius.lg, borderWidth: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  name: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8 },
  hours: { fontSize: 28, fontWeight: '800', color: colors.text, marginTop: 6, letterSpacing: -0.5 },
  track: { height: 4, borderRadius: 2, backgroundColor: colors.border, overflow: 'hidden', marginTop: 6 },
  fill: { height: '100%', borderRadius: 2 },
  pct: { fontSize: 12, color: colors.muted, marginTop: 6 },
  tasks: { fontSize: 13, lineHeight: 19, color: colors.text, marginTop: spacing.sm },
  badge: {
    alignSelf: 'flex-start',
    marginTop: spacing.sm,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden',
    fontSize: 11,
    fontWeight: '800',
    color: colors.onColor,
  },
  axisSmall: { fontSize: 12, color: colors.muted, textAlign: 'center' },
});
