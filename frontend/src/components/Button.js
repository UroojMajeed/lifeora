import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors, radius, spacing } from '../theme';

const VARIANTS = {
  primary: { bg: colors.accent, fg: colors.white, border: colors.accent },
  secondary: { bg: colors.surface, fg: colors.navy, border: colors.border },
  light: { bg: colors.white, fg: colors.navy, border: colors.white },
  ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
  ghostLight: { bg: 'transparent', fg: colors.white, border: 'transparent' },
};

export default function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: v.bg, borderColor: v.border },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={v.fg} /> : <Text style={[styles.text, { color: v.fg }]}>{title}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  text: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85, transform: [{ scale: 0.99 }] },
  disabled: { opacity: 0.45 },
});
