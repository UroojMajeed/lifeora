import { forwardRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

const TextField = forwardRef(function TextField({ label, hint, error, prefix, style, multiline, ...props }, ref) {
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

const styles = StyleSheet.create({
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
  prefix: { fontSize: 18, fontWeight: '700', color: colors.muted, marginRight: 6 },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
  multilineInput: { minHeight: 120, textAlignVertical: 'top' },
  hint: { fontSize: 13, color: colors.muted },
  error: { fontSize: 13, color: colors.error },
});
