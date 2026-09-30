import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function Chip({ label, selected, onPress }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.85 }]}
    >
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {selected ? '✓ ' : ''}
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelSelected: { color: colors.accent },
});
