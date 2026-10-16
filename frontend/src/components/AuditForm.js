import { useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { AuditFields, FIELDS } from './AuditTaskCard';
import { suggestionsFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', named: false, hours: null, money: null, energy: null };

/**
 * The audit's form, on one card: the task first; once it's in, the same three buttons as the routine's
 * cards (Time, Money, Energy) appear under it, the first one open. Each answer opens the next button's
 * choices. When all three are set, "Save & add next" adds the task (\`onAdd(task)\`) and the form
 * starts again. \`onReveal\` is called when something new opens (to scroll it into view).
 */
export default function AuditForm({ role, items = [], onAdd, onReveal }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [field, setField] = useState(null); // the open button: 'hours' | 'money' | 'energy'
  const [justAdded, setJustAdded] = useState(null);

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));
  const complete = form.named && form.hours && form.money && form.energy;

  const reveal = () => setTimeout(() => onReveal?.(), 120);
  const confirmName = (value = form.name) => {
    const n = value.trim();
    if (!n || taken(n)) return;
    Keyboard.dismiss();
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJustAdded(null);
    setForm((f) => ({ ...f, name: n, named: true }));
    setField(FIELDS.find((k) => !form[k]) ?? null);
    reveal();
  };
  // An answer: the next unset button opens (or none, once all three are set).
  const change = (patch) => {
    const next = { ...form, ...patch };
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForm(next);
    setField(FIELDS.find((k) => !next[k]) ?? null);
    reveal();
  };
  const save = () => {
    if (!complete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAdd({ activity: name.slice(0, 60), hours: form.hours, per: 'day', money: form.money, value: valueForMoney(form.money), energy: form.energy });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJustAdded(name);
    setForm(EMPTY);
    setField(null);
  };

  return (
    <View style={styles.card}>
      {justAdded ? (
        <View style={styles.added}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.addedText} numberOfLines={1}>
            {justAdded} added. Next task?
          </Text>
        </View>
      ) : null}

      {/* The task */}
      <Text style={styles.question}>What's the task?</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={form.name}
          // Changing the name after it's in keeps the answers; it just needs confirming again.
          onChangeText={(t) => setForm((f) => ({ ...f, name: t, named: false }))}
          onSubmitEditing={() => confirmName()}
          placeholder="e.g. Invoicing"
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={60}
          returnKeyType="next"
          style={[styles.input, duplicate && styles.inputDuplicate]}
          accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
        />
        {!form.named && name && !duplicate ? (
          <Pressable onPress={() => confirmName()} accessibilityRole="button" accessibilityLabel="Next" style={styles.go}>
            <Ionicons name="arrow-forward" size={20} color={colors.onColor} />
          </Pressable>
        ) : null}
      </View>
      {duplicate ? <Text style={styles.warn}>That's already in your routine.</Text> : null}
      {!form.named && suggestions.length ? (
        <View style={styles.suggestions}>
          {suggestions.slice(0, 6).map((n) => (
            <Pressable
              key={n}
              onPress={() => confirmName(n)}
              accessibilityRole="button"
              accessibilityLabel={`Add ${n}`}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {/* Time, Money and Energy: the same buttons as on the routine's cards. */}
      {form.named ? (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.fields}>
          <AuditFields
            item={{ activity: name, hours: form.hours, money: form.money, energy: form.energy }}
            field={field}
            onField={(k) => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              setField(k);
            }}
            onChange={change}
          />
        </Animated.View>
      ) : null}

      {complete ? (
        <Animated.View entering={FadeInDown.duration(250)}>
          <Button title="Save & add next" icon="add" onPress={save} style={styles.save} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : colors.primarySoft,
    ...cardShadow(colors, isDark),
  },
  added: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm + 2 },
  addedText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.success },
  question: { fontSize: 17, lineHeight: 23, fontWeight: '800', color: colors.text, marginBottom: spacing.sm + 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  input: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  inputDuplicate: { color: colors.error },
  go: { width: 50, height: 50, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  warn: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: 6 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm + 2 },
  suggestion: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.primaryDark, flexShrink: 1 },
  fields: { marginTop: spacing.md },
  save: { marginTop: spacing.lg - 4 },
});
