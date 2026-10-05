import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DRIP, HANDOFF_METHODS, statusInfo } from '../constants/content';
import { formatHours } from '../utils/format';
import { handoffSteps } from '../constants/handoffSteps';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

/** One draining task in the handoff list: name, hours, quadrant, how it's being handed off, and status. */
export default function HandoffRow({ item, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const status = statusInfo(item.status);
  const method = HANDOFF_METHODS.find((m) => m.key === item.method);
  const quadrant = DRIP[item.quadrant];
  const done = item.status === 'done';
  const steps = handoffSteps(item);
  const stepsDone = steps.filter((s) => s.done).length;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.activity}, ${formatHours(item.hours)} a day, ${status.label}${item.plan ? `. Plan: ${item.plan}` : ''}. Open.`}
      style={({ pressed }) => [styles.card, done && styles.cardDone, pressed && { opacity: 0.85 }]}
    >
      <View style={[styles.statusIcon, { backgroundColor: done ? colors.successSoft : colors.surfaceAlt }]}>
        <Ionicons name={status.icon} size={20} color={colors[status.color]} />
      </View>

      <View style={styles.middle}>
        <Text style={[styles.title, done && styles.titleDone]} numberOfLines={1}>
          {item.activity}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.tag, { color: colors[quadrant.color] }]}>{quadrant.name}</Text>
          <Text style={styles.dot}>·</Text>
          <Text style={styles.metaText}>{formatHours(item.hours)} a day</Text>
          {!done ? (
            <>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.metaText}>
                {stepsDone}/{steps.length} steps
              </Text>
            </>
          ) : null}
        </View>
        {item.plan ? (
          <View style={styles.planRow}>
            <Ionicons name={method?.icon || 'bulb-outline'} size={13} color={colors.primary} />
            <Text style={styles.plan} numberOfLines={1}>
              {item.plan}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.right}>
        <Text style={[styles.status, { color: colors[status.color] }]}>{status.short}</Text>
        <Ionicons name="chevron-forward" size={16} color={colors.muted} />
      </View>
    </Pressable>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  cardDone: { borderColor: colors.success },
  statusIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  middle: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  titleDone: { color: colors.muted, textDecorationLine: 'line-through' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tag: { fontSize: 12, fontWeight: '700' },
  dot: { fontSize: 12, color: colors.muted },
  metaText: { fontSize: 12, color: colors.muted },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  plan: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.primary },
  right: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  status: { fontSize: 12, fontWeight: '700' },
});
