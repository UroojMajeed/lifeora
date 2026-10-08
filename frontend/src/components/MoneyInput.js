import { useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { CURRENCIES } from '../constants/currencies';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing, withAlpha } from '../theme';
import { fitFontSize } from '../utils/format';

/**
 * Amount field with a currency dropdown on its left, e.g. [🇵🇰 PKR ▾ | 6,000,000].
 * The list floats over the screen (a transparent modal under the field), so a tap anywhere outside closes it.
 */
export default function MoneyInput({ label, currency, onCurrencyChange, value, onChangeText, placeholder, accessibilityLabel, onSubmitEditing, onBlur, large = false, suffix }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [query, setQuery] = useState('');
  const [anchor, setAnchor] = useState(null); // where the field is on screen: { x, y, width, height }
  const boxRef = useRef(null);
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const current = CURRENCIES.find((c) => c.code === currency);

  const q = query.trim().toLowerCase();
  const list = q
    ? CURRENCIES.filter((c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q))
    : CURRENCIES;

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    if (open) {
      close();
      return;
    }
    Keyboard.dismiss();
    // Measure the field so the list opens right under it.
    boxRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const pick = (code) => {
    Haptics.selectionAsync().catch(() => {});
    onCurrencyChange(code);
    close();
  };

  // Large mode: big digits that shrink as the number grows, so it never runs off the field.
  // Room for digits = screen - page padding - currency chip - "a year" - inner padding.
  const [boxWidth, setBoxWidth] = useState(screenWidth - 48);
  const largeFont = fitFontSize(value || placeholder, boxWidth - 104 - (suffix ? 56 : 0) - 28, 30, 14);

  const top = anchor ? anchor.y + anchor.height + 6 : 0;
  // Keep the list on screen: shrink it if the field sits low.
  const listHeight = Math.max(140, Math.min(248, screenHeight - top - 120));

  return (
    <View>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <View
        ref={boxRef}
        collapsable={false}
        onLayout={(e) => setBoxWidth(e.nativeEvent.layout.width)}
        style={[styles.box, large && styles.boxLarge, (focused || open) && styles.boxFocused]}
      >
        <Pressable
          onPress={toggle}
          accessibilityRole="button"
          accessibilityLabel={`Currency: ${current?.name || currency}. Tap to change.`}
          accessibilityState={{ expanded: open }}
          style={({ pressed }) => [styles.currency, large && styles.currencyLarge, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.flag}>{current?.flag}</Text>
          <Text style={styles.code}>{currency}</Text>
          <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={16} color={colors.muted} />
        </Pressable>

        {large ? null : <View style={styles.divider} />}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          // Lighter than typed text, so an example never looks like a real value.
          placeholderTextColor={withAlpha(colors.muted, 0.45)}
          keyboardType="decimal-pad"
          returnKeyType="done"
          onSubmitEditing={onSubmitEditing}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false);
            onBlur?.();
          }}
          style={[styles.input, large && styles.inputLarge, large && { fontSize: largeFont }]}
          accessibilityLabel={accessibilityLabel || label}
        />
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>

      <Modal visible={open && Boolean(anchor)} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close currency list" />
        {anchor ? (
          <View style={[styles.dropdown, { top, left: anchor.x, width: anchor.width }]}>
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
            <ScrollView style={{ maxHeight: listHeight }} keyboardShouldPersistTaps="handled">
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
      </Modal>
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
  // Large: a big, calm amount field (soft fill, no hard border until focused).
  boxLarge: { minHeight: 66, borderColor: 'transparent', backgroundColor: colors.surfaceAlt, borderRadius: radius.lg, paddingRight: spacing.md },
  currencyLarge: {
    height: 40,
    marginLeft: spacing.sm + 2,
    paddingLeft: 10,
    paddingRight: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  inputLarge: { fontSize: 30, fontWeight: '800', letterSpacing: -0.5, paddingHorizontal: spacing.sm + 2 },
  suffix: { fontSize: 15, fontWeight: '600', color: colors.muted, flexShrink: 0 },
  currency: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: spacing.md, paddingRight: spacing.sm, height: '100%' },
  flag: { fontSize: 20 },
  code: { fontSize: 16, fontWeight: '800', color: colors.text },
  divider: { width: 1, alignSelf: 'stretch', marginVertical: 12, backgroundColor: colors.border },
  input: { flex: 1, fontSize: 20, fontWeight: '700', color: colors.text, paddingHorizontal: spacing.md, paddingVertical: 12 },
  dropdown: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
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
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11, paddingHorizontal: spacing.md },
  rowOn: { backgroundColor: colors.primarySoft },
  rowCode: { width: 42, fontSize: 15, fontWeight: '800', color: colors.text },
  rowName: { flex: 1, fontSize: 15, color: colors.muted },
  empty: { padding: spacing.md, fontSize: 14, color: colors.muted },
});
