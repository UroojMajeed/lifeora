import { useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { AuditFields, FIELDS } from './AuditTaskCard';
import { suggestionsFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, cardShadow, radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };

/**
 * The audit's quick-add card: a friendly header with the task number, a big task box (typed, or a
 * suggestion from the scrolling line under it), and the same Time, Money and Energy buttons as the
 * routine's cards, all on show at once. "Save & next" adds the task (\`onAdd(task)\`), with a
 * small "added" moment, and the card is ready for the next one. \`onReveal\` scrolls new choices into
 * view.
 */
export default function AuditForm({ role, items = [], onAdd, onReveal }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [field, setField] = useState(null); // the open button: 'hours' | 'money' | 'energy'
  const [justAdded, setJustAdded] = useState(null);
  const [focused, setFocused] = useState(false); // typing in the task box

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const suggestions = suggestionsFor(role).filter((n) => !taken(n) && !sameName(n, form.name));
  const missing = [!name && 'task', !form.hours && 'time', !form.money && 'money', !form.energy && 'energy'].filter(Boolean);
  const ready = !missing.length && !duplicate;

  const reveal = () => setTimeout(() => onReveal?.(), 120);
  const pickSuggestion = (n) => {
    Haptics.selectionAsync().catch(() => {});
    Keyboard.dismiss();
    setForm((f) => ({ ...f, name: n }));
    setJustAdded(null);
    // Straight on to the first answer still missing.
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setField(FIELDS.find((k) => !form[k]) ?? null);
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
    if (!ready) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    Keyboard.dismiss();
    onAdd({ activity: name.slice(0, 60), hours: form.hours, per: 'day', money: form.money, value: valueForMoney(form.money), energy: form.energy });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJustAdded(name);
    setForm(EMPTY);
    setField(null);
  };

  return (
    <View style={styles.card}>
      {/* A friendly header: what this is, and which task you're on. */}
      <View style={styles.head}>
        <LinearGradient colors={[brand.apricot, colors.primary]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.headIcon}>
          <Ionicons name="sparkles" size={16} color={colors.onColor} />
        </LinearGradient>
        <Text style={styles.headTitle}>Add a task</Text>
        <View style={styles.count}>
          <Text style={styles.countText}>Task {items.length + 1}</Text>
        </View>
      </View>

      {/* The small "added" moment after each save. */}
      {justAdded ? (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)} style={styles.added}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <Text style={styles.addedText} numberOfLines={1}>
            {justAdded} is in your routine
          </Text>
        </Animated.View>
      ) : null}

      {/* The task box */}
      <View style={[styles.inputBox, focused && styles.inputBoxFocused, duplicate && styles.inputBoxError]}>
        <Ionicons name="create-outline" size={22} color={duplicate ? colors.error : colors.primary} />
        <TextInput
          value={form.name}
          onChangeText={(t) => {
            setJustAdded(null);
            setForm((f) => ({ ...f, name: t }));
          }}
          onSubmitEditing={() => {
            Keyboard.dismiss();
            if (name && !form.hours) setField('hours');
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="What do you do on a work day?"
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={60}
          returnKeyType="next"
          style={[styles.input, duplicate && { color: colors.error }]}
          accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
        />
      </View>
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

      <Button
        title="Save & next"
        icon="arrow-forward"
        onPress={save}
        disabled={!ready}
        style={styles.save}
      />
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
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, marginBottom: spacing.md },
  headIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  headTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  count: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  countText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  added: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm + 2,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.successSoft,
  },
  addedText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.success },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primarySoft,
    backgroundColor: colors.surfaceAlt,
  },
  inputBoxFocused: { borderColor: colors.primary, backgroundColor: colors.surface },
  inputBoxError: { borderColor: colors.error },
  input: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.text, paddingVertical: 14 },
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
  save: { marginTop: spacing.lg - 4 },
});
