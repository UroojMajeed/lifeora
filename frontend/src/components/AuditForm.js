import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { AuditFields, FIELDS } from './AuditTaskCard';
import { defaultsFor, suggestionsFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, cardShadow, radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };
const RECENT = 3; // the last few tasks added, shown as chips

/**
 * The audit's quick-add card: a friendly header with the task number, the last few tasks you added
 * (Undo on the newest), a big task box with suggestions under it while it's empty, and the same Time,
 * Money and Energy buttons as the routine's cards. A suggestion fills in what we can guess (its usual
 * time and a typical $ level), so often only the energy is left. The screen's sticky bar saves it:
 * `ref.save()`, with `onReadyChange(ready)` telling it when everything is filled in.
 */
const AuditForm = forwardRef(function AuditForm({ role, items = [], onAdd, onRemove, onReadyChange, onReveal }, ref) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [field, setField] = useState(null); // the open button: 'hours' | 'money' | 'energy'
  const [focused, setFocused] = useState(false);
  const [lastAdded, setLastAdded] = useState(null); // the task Undo applies to

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));
  const ready = Boolean(name) && !duplicate && Boolean(form.hours && form.money && form.energy);
  const recent = items.slice(-RECENT).reverse();

  useEffect(() => {
    onReadyChange?.(ready);
  }, [ready, onReadyChange]);

  const reveal = () => setTimeout(() => onReveal?.(), 120);
  const openFirstMissing = (f) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setField(FIELDS.find((k) => !f[k]) ?? null);
    reveal();
  };
  // A name we know comes with its usual time and a typical $ level, so you mostly just check them.
  const withDefaults = (f, n) => {
    const guess = defaultsFor(n);
    return { ...f, name: n, hours: f.hours ?? guess.hours ?? null, money: f.money ?? guess.money ?? null };
  };
  const pickSuggestion = (n) => {
    Haptics.selectionAsync().catch(() => {});
    Keyboard.dismiss();
    const next = withDefaults(form, n);
    setForm(next);
    setLastAdded(null);
    openFirstMissing(next);
  };
  // Enter in the task box: on to the first answer still missing.
  const submitName = () => {
    Keyboard.dismiss();
    if (!name || duplicate) return;
    const next = withDefaults(form, name);
    setForm(next);
    openFirstMissing(next);
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
      setLastAdded(name);
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
        <Text style={styles.headTitle}>Add a task</Text>
        <View style={styles.count}>
          <Text style={styles.countText}>Task {items.length + 1}</Text>
        </View>
      </View>

      {/* The last few added, as chips (Undo on the newest, right after saving it). */}
      {recent.length ? (
        <View style={styles.recent}>
          {recent.map((it) => (
            <Animated.View key={it.activity} entering={FadeIn.duration(250)} style={styles.recentChip}>
              <Ionicons name={energyIcon(it)} size={12} color={energyColor(it)} />
              <Text style={styles.recentText} numberOfLines={1}>
                {it.activity} · {it.hours}h
              </Text>
              {lastAdded === it.activity ? (
                <Pressable
                  onPress={() => {
                    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                    onRemove?.(it.activity);
                    setLastAdded(null);
                  }}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Undo adding ${it.activity}`}
                >
                  <Text style={styles.undo}>Undo</Text>
                </Pressable>
              ) : null}
            </Animated.View>
          ))}
        </View>
      ) : null}

      {/* The task box: big, and outlined while you type. */}
      <View style={[styles.inputBox, focused && styles.inputBoxFocused, duplicate && styles.inputBoxError]}>
        <Ionicons name="create-outline" size={22} color={duplicate ? colors.error : colors.primary} />
        <TextInput
          value={form.name}
          onChangeText={(t) => {
            setLastAdded(null);
            setForm((f) => ({ ...f, name: t }));
          }}
          onSubmitEditing={submitName}
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
  headTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  count: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  countText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  recent: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm + 4 },
  recentChip: {
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  recentText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.text },
  undo: { fontSize: 12, fontWeight: '800', color: colors.primary, marginLeft: 2 },
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
});
