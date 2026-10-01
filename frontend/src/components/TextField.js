import { forwardRef, useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const TextField = forwardRef(function TextField({ label, hint, error, prefix, style, multiline, ...props }, ref) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.wrap, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <View
        style={[
          styles.box,
          multiline && styles.multilineBox,
          focused && styles.focused,
          error && styles.errored,
        ]}
      >
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          style={[styles.input, multiline && styles.multilineInput]}
          multiline={multiline}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...props}
        />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
});

export default TextField;

const makeStyles = (colors) => ({
  wrap: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: colors.text },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
  },
  multilineBox: { alignItems: 'flex-start', paddingVertical: spacing.sm },
  focused: { borderColor: colors.primary },
  errored: { borderColor: colors.error },
  prefix: { fontSize: 16, fontWeight: '700', color: colors.muted, marginRight: 8 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
  multilineInput: { minHeight: 160, textAlignVertical: 'top', lineHeight: 22 },
  hint: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.error },
});
