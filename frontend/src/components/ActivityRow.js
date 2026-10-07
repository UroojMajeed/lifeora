import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hoursLabel, timeText, weeklyOf } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

export const ACTIVITY_ROW_HEIGHT = 62;

/**
 * One activity in the user's day: drag handle, name, hours (tap the row to edit), remove.
 * `badge` ({ label, tone: 'success' | 'primary' }) marks e.g. a handed-off task or extra time from Fill.
 */
export default function ActivityRow({ item, isActive, Handle, onEdit, onRemove, badge, muted }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.card, !Handle && styles.cardNoHandle, isActive && styles.cardActive]}>
      {/* The drag handle only shows where the list can be reordered. */}
      {Handle ? (
        <Handle>
          <View collapsable={false} accessibilityLabel={`Drag to move ${item.activity}`} style={styles.handle}>
            <Ionicons name="reorder-three" size={26} color={isActive ? colors.primary : colors.muted} />
          </View>
        </Handle>
      ) : null}

      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${item.activity}, ${timeText(item)}. Tap to edit.`}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.6 }]}
      >
        <View style={styles.titleWrap}>
          <Text style={[styles.title, muted && styles.titleMuted]} numberOfLines={1}>
            {item.activity}
          </Text>
          {badge ? (
            <Text
              style={[
                styles.badge,
                badge.tone === 'success'
                  ? { color: colors.success, backgroundColor: colors.successSoft }
                  : { color: colors.primaryDark, backgroundColor: colors.primarySoft },
              ]}
              numberOfLines={1}
            >
              {badge.label}
            </Text>
          ) : null}
        </View>
        <View style={styles.hours}>
          <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.hoursText}>{item.per === 'week' ? `${weeklyOf(item)}h/wk` : hoursLabel(item.hours)}</Text>
        </View>
      </Pressable>

      <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activity}`}>
        <Ionicons name="close-circle" size={22} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    height: ACTIVITY_ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: 2,
    paddingRight: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  cardNoHandle: { paddingLeft: spacing.md },
  cardActive: { borderColor: colors.primary },
  handle: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: '100%' },
  titleWrap: { flex: 1, gap: 3 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text },
  titleMuted: { color: colors.muted, textDecorationLine: 'line-through' },
  badge: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  hours: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  hoursText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
});
