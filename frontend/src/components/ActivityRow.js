import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, hoursLabel, timeText, usualHours, weeklyOf } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

export const ACTIVITY_ROW_HEIGHT = 62;

/**
 * One task in the user's routine: name, its time (or "Set time" while it has none) and remove.
 * Tapping the card opens the hour choices right on it (`open`); picking one calls `onPickHours`.
 * `badge` ({ label, tone: 'success' | 'primary' }) marks e.g. a handed-off task or extra time from Fill.
 */
export default function ActivityRow({ item, open, onToggle, onPickHours, onRemove, badge, muted }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const needsTime = !item.hours;
  const usual = usualHours(item.activity);

  const pick = (h) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPickHours?.(h);
  };

  return (
    <View style={[styles.card, (open || needsTime) && styles.cardActive]}>
      <View style={styles.top}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityLabel={`${item.activity}, ${needsTime ? 'no time yet' : timeText(item)}. Tap to set the time.`}
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
          {needsTime ? (
            <View style={[styles.hours, styles.hoursNeeded]}>
              <Ionicons name="time-outline" size={14} color={colors.accentText} />
              <Text style={[styles.hoursText, styles.hoursTextNeeded]}>Set time</Text>
            </View>
          ) : (
            <View style={styles.hours}>
              <Ionicons name="time-outline" size={14} color={colors.primaryDark} />
              <Text style={styles.hoursText}>{item.per === 'week' ? `${weeklyOf(item)}h/wk` : hoursLabel(item.hours)}</Text>
            </View>
          )}
        </Pressable>

        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activity}`}>
          <Ionicons name="close-circle" size={22} color={colors.muted} />
        </Pressable>
      </View>

      {/* The hour choices, right on the card. */}
      {open ? (
        <View style={styles.picker}>
          <Text style={styles.ask}>How long a day?{usual ? '  The highlighted time is usual.' : ''}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
            {HOUR_OPTIONS.map((h) => {
              const on = h === item.hours || (!item.hours && h === usual);
              return (
                <Pressable
                  key={h}
                  onPress={() => pick(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`${hoursLabel(h)} a day`}
                  style={({ pressed }) => [styles.hour, on && styles.hourOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.hourText, on && styles.hourTextOn]}>{hoursLabel(h)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  cardActive: { borderColor: colors.primary },
  top: { minHeight: ACTIVITY_ROW_HEIGHT - 4, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  body: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
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
  hoursNeeded: { backgroundColor: colors.accentSoft },
  hoursText: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  hoursTextNeeded: { color: colors.accentText },
  picker: { paddingBottom: spacing.md - 2, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: spacing.sm + 2 },
  ask: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  chips: { gap: spacing.sm },
  hour: {
    minWidth: 60,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hourOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  hourText: { fontSize: 14, fontWeight: '700', color: colors.text },
  hourTextOn: { color: colors.primaryDark },
});
