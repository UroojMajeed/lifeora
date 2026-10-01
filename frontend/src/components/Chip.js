import { Pressable, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** Rounded tag. Shows a ✓ when selected, or a custom Ionicons `icon` (e.g. "add"). */
export default function Chip({ label, selected, onPress, icon }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const iconName = selected ? 'checkmark' : icon;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [styles.chip, selected && styles.selected, pressed && { opacity: 0.8 }]}
    >
      {iconName ? <Ionicons name={iconName} size={15} color={selected ? colors.primaryDark : colors.muted} /> : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  selected: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  labelSelected: { color: colors.primaryDark },
});
