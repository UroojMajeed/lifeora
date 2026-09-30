import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

/** Selectable card. `multi` shows a checkbox, otherwise a radio. */
export default function OptionCard({ title, description, badge, selected, onPress, multi = false }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole={multi ? 'checkbox' : 'radio'}
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.card, selected && styles.selected, pressed && styles.pressed]}
    >
      <View style={[styles.indicator, multi ? styles.square : styles.round, selected && styles.indicatorOn]}>
        {selected ? <View style={[styles.dot, multi ? styles.dotSquare : styles.dotRound]} /> : null}
      </View>
      <View style={styles.textWrap}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          {badge ? <Text style={styles.badge}>{badge}</Text> : null}
        </View>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pressed: { opacity: 0.9 },
  indicator: {
    width: 22,
    height: 22,
    marginTop: 1,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  round: { borderRadius: 11 },
  square: { borderRadius: 6 },
  indicatorOn: { borderColor: colors.primary },
  dot: { backgroundColor: colors.primary },
  dotRound: { width: 10, height: 10, borderRadius: 5 },
  dotSquare: { width: 12, height: 12, borderRadius: 3 },
  textWrap: { flex: 1, gap: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  title: { fontSize: 16, fontWeight: '700', color: colors.text, flexShrink: 1 },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    backgroundColor: colors.white,
    borderRadius: radius.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  description: { fontSize: 14, lineHeight: 20, color: colors.muted },
});
