import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';
import { withFonts } from '../theme/fonts';

const variants = (colors) => ({
  primary: { bg: colors.primary, fg: colors.onColor, border: colors.primary },
  secondary: { bg: colors.surface, fg: colors.text, border: colors.border },
  ghost: { bg: 'transparent', fg: colors.primaryDark, border: 'transparent' },
  light: { bg: colors.white, fg: '#1B1530', border: colors.white },
});

/** Pill button. `icon` is an Ionicons name shown after the title (e.g. "arrow-forward"). */
export default function Button({ title, onPress, variant = 'primary', icon, loading = false, disabled = false, style }) {
  const { colors } = useTheme();
  const all = variants(colors);
  const v = all[variant] || all.primary;
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
        variant === 'primary' && !isDisabled && { shadowColor: colors.primary, ...styles.glow },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} />
      ) : (
        <View style={styles.row}>
          <Text style={[styles.text, { color: v.fg }]}>{title}</Text>
          {icon ? <Ionicons name={icon} size={18} color={v.fg} /> : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create(withFonts({
  base: {
    minHeight: 56,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  glow: { shadowOpacity: 0.3, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  // A fixed line height keeps the label exactly centred next to the icon.
  text: { fontSize: 16, lineHeight: 20, fontWeight: '700', letterSpacing: 0.2 },
  pressed: { opacity: 0.88, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.4 },
}));
