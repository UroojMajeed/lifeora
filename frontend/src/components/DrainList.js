import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const SHOW = 3;

/**
 * "Still draining you": the biggest draining tasks not handed off yet, each one tap from its handoff.
 * `skip` leaves out the task already shown as the next move. Nothing left: renders nothing.
 */
export default function DrainList({ handoffs = [], skip, onOpen, onSeeAll, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const open = handoffs
    .filter((h) => h.status === 'mine' || h.status === 'in_progress')
    .filter((h) => !skip || h.activity.toLowerCase() !== skip.toLowerCase())
    .sort((a, b) => b.hours - a.hours);
  if (!open.length) return null;

  return (
    <View style={style}>
      <View style={styles.head}>
        <Text style={styles.title}>Still draining you</Text>
        <Pressable onPress={onSeeAll} hitSlop={10} accessibilityRole="button" style={styles.all}>
          <Text style={styles.allText}>See all</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>
      <Card style={styles.card}>
        {open.slice(0, SHOW).map((h, i) => {
          const started = h.status === 'in_progress';
          return (
            <Pressable
              key={h.activity}
              onPress={() => onOpen(h.activity)}
              accessibilityRole="button"
              accessibilityLabel={`${h.activity}, ${formatHours(h.hours * WORKDAYS_PER_WEEK)} a week. ${started ? 'Continue the handoff' : 'Hand it off'}.`}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { opacity: 0.7 }]}
            >
              <View style={styles.dot} />
              <View style={styles.text}>
                <Text style={styles.name} numberOfLines={1}>
                  {h.activity}
                </Text>
                <Text style={styles.hours}>{formatHours(h.hours * WORKDAYS_PER_WEEK)} a week</Text>
              </View>
              <View style={[styles.action, started && styles.actionStarted]}>
                <Text style={[styles.actionText, started && styles.actionTextStarted]}>{started ? 'Continue' : 'Hand off'}</Text>
              </View>
            </Pressable>
          );
        })}
      </Card>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  all: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  allText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  card: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 58 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.border },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.error },
  text: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  hours: { fontSize: 13, color: colors.muted, marginTop: 1 },
  action: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  actionStarted: { backgroundColor: colors.primarySoft },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.onColor },
  actionTextStarted: { color: colors.primaryDark },
});
