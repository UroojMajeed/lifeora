import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FIELDS } from './AuditTaskCard';
import AuditChoices from './AuditChoices';
import { suggestionsFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };

/**
 * The audit's add-a-task form, filling the page with the whole task at once: the task
 * box with quick picks, then its three questions, all shown from the start (how long, what it pays,
 * how it feels: one tap each). The 0/60 counter shows only near the limit. The screen's buttons save it: `ref.save()`,
 * with `onReadyChange(ready)` telling it when everything is filled in.
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
  // An answer: just set it (all three questions are open, so the page stays still).
  const change = (patch) => setForm((f) => ({ ...f, ...patch }));

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
      {/* The task: a roomy writing area (about three lines), calm text, a teal edge while you type. */}
      {/* The whole field opens the keyboard on the first tap. */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={[styles.inputBox, focused && styles.inputBoxFocused, duplicate && styles.inputBoxError]}
      >
        <Ionicons name="pencil-outline" size={18} color={duplicate ? colors.error : focused ? colors.primary : colors.muted} style={styles.inputIcon} />
        {/* A short, pale hint: smaller than real text, so it never looks filled. */}
        {!form.name ? (
          <Text pointerEvents="none" style={styles.hint}>
            Type a task
          </Text>
        ) : null}
        <TextInput
          ref={inputRef}
          value={form.name}
          // One line of meaning, but room to see it all: Return finishes (no new lines).
          onChangeText={(t) => setForm((f) => ({ ...f, name: t.replace(/\n/g, ' ') }))}
          onSubmitEditing={submitName}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={60}
          multiline
          blurOnSubmit
          returnKeyType="done"
          style={[styles.input, duplicate && { color: colors.error }]}
          accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
        />
        {/* Which task this is, quietly (from the second one). */}
        {items.length ? <Text style={styles.number}>Task {items.length + 1}</Text> : null}
      </Pressable>
      {duplicate ? <Text style={styles.warn}>That's already in your routine.</Text> : null}
      {/* The limit, only when it's close. */}
      {form.name.length >= 45 ? <Text style={styles.counter}>{form.name.length}/60</Text> : null}

      {/* Suggestions: right under the task box while it's empty (one line, scroll sideways for more). */}
      {suggestions.length && !form.name ? (
        <>
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
                <Ionicons name="add" size={14} color={colors.muted} />
                <Text style={styles.suggestionText} numberOfLines={1}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* The three questions, all shown from the start so the whole task is clear: one tap each. */}
      <AuditChoices item={{ activity: name, hours: form.hours, money: form.money, energy: form.energy }} onChange={change} />
    </View>
  );
});

export default AuditForm;

const makeStyles = (colors, isDark) => ({
  card: {},
  counter: { alignSelf: 'flex-end', fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 4 },
  number: { fontSize: 12, fontWeight: '700', color: colors.muted },
  inputBox: {
    // One line, like a standard text field (it grows if a long name wraps).
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong, // a clear outline, so it reads as a field to write in
    backgroundColor: colors.surface, // white, so it reads as empty until you type
  },
  // Typing: a teal edge.
  inputBoxFocused: { borderColor: colors.primary },
  inputBoxError: { borderColor: colors.error },
  inputIcon: {},
  hint: { position: 'absolute', left: spacing.md + 18 + spacing.sm, fontSize: 14, color: colors.muted, opacity: 0.6 },
  input: { flex: 1, minHeight: 22, fontSize: 16, lineHeight: 22, fontWeight: '500', color: colors.text, padding: 0 },
  warn: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: 6 },
  // Same columns and gap as the Time / Money / Energy buttons below them.
  // One line of suggestions, edge to edge inside the card (scrolls sideways): soft grey quick picks,
  // no outline, so they never look like the Time / Money / Energy buttons.
  suggestionsLine: { marginHorizontal: -spacing.lg, marginTop: spacing.md },
  suggestions: { gap: 6, paddingHorizontal: spacing.lg },
  suggestion: {
    maxWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  suggestionText: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
});
