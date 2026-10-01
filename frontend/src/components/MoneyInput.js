import { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CURRENCIES } from '../constants/currencies';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** Amount field with a currency dropdown on its left, e.g. [🇵🇰 PKR ▾ | 6,000,000]. */
export default function MoneyInput({ label, currency, onCurrencyChange, value, onChangeText, placeholder }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const current = CURRENCIES.find((c) => c.code === currency);

  const q = query.trim().toLowerCase();
  const list = q
    ? CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : CURRENCIES;

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
    setQuery('');
  };

  const pick = (code) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onCurrencyChange(code);
    setOpen(false);
    setQuery('');
  };

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View style={[styles.box, (focused || open) && styles.boxFocused]}>
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={`Currency: ${current?.name || currency}. Tap to change.`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.currency, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.flag}>{current?.flag}</Text>
          <Text style={styles.code}>{currency}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>

        <View style={styles.divider} />

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          keyboardType="decimal-pad"
          returnKeyType="done"
          keyboardAppearance={isDark ? 'dark' : 'light'}
          onFocus={() => {
            setFocused(true);
            if (open) toggle();
          }}
          onBlur={() => setFocused(false)}
          style={styles.input}
          accessibilityLabel={label}
        />
      </View>

      {open ? (
        <View style={styles.dropdown}>
          <View style={styles.search}>
            <Ionicons name="search" size={16} color={colors.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search currency"
              placeholderTextColor={colors.muted}
              autoCorrect={false}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              style={styles.searchInput}
            />
          </View>
          <ScrollView style={styles.list} nestedScrollEnabled keyboardShouldPersistTaps="handled">
            {list.map((c) => {
              const on = c.code === currency;
              return (
                <Pressable
                  key={c.code}
                  onPress={() => pick(c.code)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.flag}>{c.flag}</Text>
                  <Text style={styles.rowCode}>{c.code}</Text>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {c.name}
                  </Text>
                  {on ? <Ionicons name="checkmark" size={18} color={colors.primaryDark} /> : null}
                </Pressable>
              );
            })}
            {!list.length ? <Text style={styles.empty}>No currency matches “{query}”.</Text> : null}
          </ScrollView>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  label: { fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 58,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  boxFocused: { borderColor: colors.primary },
  currency: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: spacing.md, paddingRight: spacing.sm, height: '100%' },
  flag: { fontSize: 20 },
  code: { fontSize: 16, fontWeight: '800', color: colors.text },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 12, backgroundColor: colors.border },
  input: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12 },
  dropdown: {
    marginTop: 6,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.text, paddingVertical: 12 },
  list: { maxHeight: 248 },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11, paddingHorizontal: spacing.md },
  rowOn: { backgroundColor: colors.primarySoft },
  rowCode: { width: 42, fontSize: 15, fontWeight: '800', color: colors.text },
  rowName: { flex: 1, fontSize: 15, color: colors.muted },
  empty: { padding: spacing.md, fontSize: 14, color: colors.muted },
});
