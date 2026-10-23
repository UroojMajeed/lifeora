import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { FIELDS } from './AuditTaskCard';
import AuditQuestionCards from './AuditQuestionCards';
import { suggestionsFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };

/**
 * The audit's add-a-task form: the task's name on a small card (with quick picks), then its three
 * questions as cards, one open at a time (how long, what it pays, how it feels). Each answer folds its
 * card and opens the next. The 0/60 counter shows only near the limit. The screen's buttons save it: `ref.save()`,
 * with `onReadyChange(ready)` telling it when everything is filled in.
 */
const AuditForm = forwardRef(function AuditForm({ role, items = [], onAdd, onReadyChange, onReveal }, ref) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [field, setField] = useState('hours'); // the open card: 'hours' | 'money' | 'energy' | null
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
  // An answer: set it, fold its card and open the next one still missing.
  const change = (patch) => {
    const next = { ...form, ...patch };
    setForm(next);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setField(FIELDS.find((k) => !next[k]) ?? null);
  };
  const openCard = (k) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setField(k);
  };

  useImperativeHandle(ref, () => ({
    save() {
      if (!ready) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Keyboard.dismiss();
      onAdd({ activity: name.slice(0, 60), hours: form.hours, per: 'day', money: form.money, value: valueForMoney(form.money), energy: form.energy });
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setForm(EMPTY);
      setField('hours');
    },
  }));

  return (
    <View style={styles.card}>
      {/* The task's name on a small white card: "Task N" on top, the name big under it, teal while you type. */}
      {/* Anywhere on the card opens the keyboard. */}
      <Pressable
        onPress={() => inputRef.current?.focus()}
        accessible={false}
        style={[styles.inputBox, focused && styles.inputBoxFocused, duplicate && styles.inputBoxError]}
      >
        <Text style={styles.number}>Task {items.length + 1}</Text>
        <View>
          {/* A pale hint, so it never looks filled. */}
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
        </View>
      </Pressable>
      {duplicate ? <Text style={styles.warn}>That's already in your routine.</Text> : null}
      {/* The limit, only when it's close. */}
      {form.name.length >= 45 ? <Text style={styles.counter}>{form.name.length}/60</Text> : null}

      {/* Suggestions: right under the task box while it's empty (one line, scroll sideways for more). */}
      {suggestions.length && !form.name && focused ? (
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

      {/* The three questions, one card each, one open at a time. */}
      <View style={styles.cards}>
        <AuditQuestionCards
          item={{ activity: name, hours: form.hours, money: form.money, energy: form.energy }}
          open={field}
          onOpen={openCard}
          onChange={change}
        />
      </View>
    </View>
  );
});

export default AuditForm;

const makeStyles = (colors, isDark) => ({
  card: {},
  cards: { marginTop: spacing.md },
  counter: { alignSelf: 'flex-end', fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 4 },
  number: { fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 },
  // The name card.
  inputBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Typing: a teal edge (1.5, with the padding trimmed so nothing moves).
  inputBoxFocused: { borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 11.5, paddingHorizontal: 13.5 },
  inputBoxError: { borderColor: colors.error },
  hint: { position: 'absolute', left: 0, fontSize: 20, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, color: colors.muted, opacity: 0.45 },
  input: { minHeight: 28, fontSize: 20, lineHeight: 28, fontWeight: '800', letterSpacing: -0.4, color: colors.text, padding: 0 },
  warn: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: 6 },
  // Same columns and gap as the Time / Money / Energy buttons below them.
  // One line of suggestions, edge to edge inside the card (scrolls sideways): soft grey quick picks,
  // no outline, so they never look like the Time / Money / Energy buttons.
  suggestionsLine: { marginHorizontal: -spacing.lg, marginTop: spacing.sm + 4, marginBottom: spacing.xs },
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
