import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { hoursLabel } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

export const ACTIVITY_ROW_HEIGHT = 62;

const PassThrough = ({ children }) => children;

/** One activity in the user's day: drag handle, name, hours (tap the row to edit), remove. */
export default function ActivityRow({ item, isActive, Handle = PassThrough, onEdit, onRemove }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.card, isActive && styles.cardActive]}>
      <Handle>
        <View collapsable={false} accessibilityLabel={`Drag to move ${item.activity}`} style={styles.handle}>
          <Ionicons name="reorder-three" size={26} color={isActive ? colors.primary : colors.muted} />
        </View>
      </Handle>

      <Pressable
        onPress={onEdit}
        accessibilityRole="button"
        accessibilityLabel={`${item.activity}, ${hoursLabel(item.hours)} a day. Tap to edit.`}
        style={({ pressed }) => [styles.body, pressed && { opacity: 0.6 }]}
      >
        <Text style={styles.title} numberOfLines={1}>
          {item.activity}
        </Text>
        <View style={styles.hours}>
          <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
          <Text style={styles.hoursText}>{hoursLabel(item.hours)}</Text>
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
  cardActive: { borderColor: colors.primary },
  handle: { width: 44, height: '100%', alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, height: '100%' },
  title: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
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
