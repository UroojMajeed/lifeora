import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AuditFields, FIELDS } from './AuditTaskCard';
import { suggestionsFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, cardShadow, radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };

/**
 * The audit's quick-add card: a friendly header with the task number, a big task box with suggestions
 * under it while it's empty, and the same Time, Money and Energy buttons as the routine's cards. The
 * screen's buttons save it: `ref.save()`, with `onReadyChange(ready)` telling it when everything is
 * filled in.
 */
const AuditForm = forwardRef(function AuditForm({ role, items = [], onAdd, onReadyChange, onReveal }, ref) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [field, setField] = useState(null); // the open button: 'hours' | 'money' | 'energy'
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));
  const ready = Boolean(name) && !duplicate && Boolean(form.hours && form.money && form.energy);

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  const reveal = () => setTimeout(() => onReveal?.(), 120);
  const openFirstMissing = (f) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setField(FIELDS.find((k) => !f[k]) ?? null);
    reveal();
  };
  const pickSuggestion = (n) => {
    Haptics.selectionAsync().catch(() => {});
    Keyboard.dismiss();
    const next = { ...form, name: n };
    setForm(next);
    openFirstMissing(next);
  };
  // Enter in the task box: on to the first answer still missing.
  const submitName = () => {
    Keyboard.dismiss();
    if (!name || duplicate) return;
    openFirstMissing(form);
  };
  // An answer: the next unset button opens (or none, once all three are set).
  const change = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    openFirstMissing(next);
  };

  useImperativeHandle(ref, () => ({
    save() {
      if (!ready) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Keyboard.dismiss();
      onAdd({ activity: name.slice(0, 60), hours: form.hours, per: 'day', money: form.money, value: valueForMoney(form.money), energy: form.energy });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setForm(EMPTY);
      setField(null);
    },
  }));

  const energyIcon = (it) => (it.energy === 'energizing' ? 'flash' : 'battery-dead');
  const energyColor = (it) => (it.energy === 'energizing' ? colors.success : colors.error);

  return (
    <View style={styles.card}>
      {/* A friendly header: what this is, and which task you're on. */}
      <View style={styles.head}>
        <LinearGradient colors={[brand.apricot, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headIcon}>
          <Ionicons name="sparkles" size={16} color={colors.onColor} />
        </LinearGradient>
        <View style={styles.headText}>
          <Text style={styles.headTitle}>Add a task</Text>
        </View>
        <View style={styles.count}>
          <Text style={styles.countText}>Task {items.length + 1}</Text>
        </View>
      </View>

      {/* The task: a roomy writing area (about three lines), calm text, a teal edge while you type. */}
      <View style={styles.labelRow}>
        <Text style={styles.label}>Task</Text>
        <Text style={styles.counter}>{form.name.length}/60</Text>
      </View>
      {/* The whole area opens the keyboard on the first tap (not just the line with the text). */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={[styles.inputBox, focused && styles.inputBoxFocused, duplicate && styles.inputBoxError]}
      >
        <Ionicons name="create-outline" size={18} color={duplicate ? colors.error : focused ? colors.primary : colors.muted} style={styles.inputIcon} />
        <TextInput
          ref={inputRef}
          value={form.name}
          // One line of meaning, but room to see it all: Return finishes (no new lines).
          onChangeText={(t) => setForm((f) => ({ ...f, name: t.replace(/\n/g, ' ') }))}
          onSubmitEditing={submitName}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What's the task? e.g. Invoicing clients"
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={60}
          multiline
          blurOnSubmit
          returnKeyType="done"
          textAlignVertical="top"
          style={[styles.input, duplicate && { color: colors.error }]}
          accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
        />
      </Pressable>
      {duplicate ? <Text style={styles.warn}>That's already in your routine.</Text> : null}

      {/* Suggestions: right under the task box while it's empty (one line, scroll sideways for more). */}
      {suggestions.length && !form.name ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          style={styles.suggestionsLine}
          contentContainerStyle={styles.suggestions}
        >
          {suggestions.slice(0, 14).map((n) => (
            <Pressable
              key={n}
              onPress={() => pickSuggestion(n)}
              accessibilityRole="button"
              accessibilityLabel={`Use ${n}`}
              style={({ pressed }) => [styles.suggestion, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text style={styles.suggestionText} numberOfLines={1}>
                {n}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Time, Money and Energy: all on show, the same buttons as on the routine's cards. */}
      <View style={styles.fields}>
        <AuditFields
          item={{ activity: name, hours: form.hours, money: form.money, energy: form.energy }}
          field={field}
          onField={(k) => {
            Keyboard.dismiss();
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setField(k);
            reveal();
          }}
          onChange={change}
        />
      </View>
    </View>
  );
});

export default AuditForm;

const makeStyles = (colors, isDark) => ({
  card: {
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : colors.primarySoft,
    ...cardShadow(colors, isDark),
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginBottom: spacing.md },
  headIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1 },
  headTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  count: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  countText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 },
  label: { fontSize: 13, fontWeight: '800', color: colors.text },
  counter: { fontSize: 12, fontWeight: '600', color: colors.muted },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    minHeight: 96,
    paddingHorizontal: spacing.md,
    paddingTop: 14,
    paddingBottom: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surfaceAlt,
  },
  // Typing: a white area with a teal edge.
  inputBoxFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  inputBoxError: { borderColor: colors.error },
  inputIcon: { marginTop: 2 },
  input: { flex: 1, alignSelf: 'stretch', minHeight: 70, fontSize: 16, lineHeight: 22, fontWeight: '500', color: colors.text, padding: 0 },
  warn: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: 6 },
  // One line of suggestions, edge to edge inside the card (scrolls sideways).
  suggestionsLine: { marginTop: spacing.sm + 2, marginHorizontal: -(spacing.md + 4) },
  suggestions: { gap: 6, paddingHorizontal: spacing.md + 4 },
  suggestion: {
    maxWidth: 200,
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
  fields: { marginTop: spacing.md + 2 },
});
