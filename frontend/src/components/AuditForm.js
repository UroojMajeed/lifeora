import { useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { HOUR_OPTIONS, MONEY_LEVELS, dollars, suggestionsFor, usualHours, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const ENERGY = [
  { key: 'draining', label: 'Drains me', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes me', icon: 'flash', tone: 'success' },
];
const short = (h) => (h < 1 ? `${h * 60} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`);
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', named: false, hours: null, money: null, energy: null };

/**
 * The audit's form, all on one card, opening up as you go: the task first; once it's in, how long it
 * takes a day appears under it; once that's picked, how much money it makes; then how it makes you
 * feel; then "Save & add next". Earlier answers stay visible and can be changed. Saving adds the task
 * (\`onAdd(task)\`) and the form starts again. \`onReveal\` is called when a new question opens (to
 * scroll it into view).
 */
export default function AuditForm({ role, items = [], onAdd, onReveal }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [justAdded, setJustAdded] = useState(null);

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const usual = name ? usualHours(name) : null;
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));
  const complete = form.named && form.hours && form.money && form.energy;

  // Each answer opens the next question below it (and scrolls it into view).
  const update = (patch) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setForm((f) => ({ ...f, ...patch }));
    setTimeout(() => onReveal?.(), 120);
  };
  const confirmName = (value = form.name) => {
    const n = value.trim();
    if (!n || taken(n)) return;
    Keyboard.dismiss();
    setJustAdded(null);
    update({ name: n, named: true });
  };
  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    update(patch);
  };
  const save = () => {
    if (!complete) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAdd({ activity: name.slice(0, 60), hours: form.hours, per: 'day', money: form.money, value: valueForMoney(form.money), energy: form.energy });
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setJustAdded(name);
    setForm(EMPTY);
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

      {/* 1) The task */}
      <Text style={styles.question}>What's the task?</Text>
      <View style={styles.inputRow}>
        <TextInput
          value={form.name}
          // Changing the name after it's in keeps the other answers; it just needs confirming again.
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

      {/* 2) Time a day: opens once the task is in. */}
      {form.named ? (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.section}>
          <Text style={styles.question}>How long a day?</Text>
          <View style={styles.grid}>
            {HOUR_OPTIONS.map((h) => {
              const on = form.hours === h;
              const hint = !form.hours && h === usual;
              return (
                <Pressable
                  key={h}
                  onPress={() => pick({ hours: h })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [styles.choice, on && styles.choiceOn, hint && styles.choiceHint, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{short(h)}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      {/* 3) Money: opens once there's a time. */}
      {form.named && form.hours ? (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.section}>
          <Text style={styles.question}>How much money does it make?</Text>
          <View style={styles.coins}>
            {MONEY_LEVELS.map((m) => {
              const on = form.money === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => pick({ money: m })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${m} of 5`}
                  style={({ pressed }) => [styles.coin, on && styles.coinOn, pressed && { transform: [{ scale: 0.94 }] }]}
                >
                  {on ? <LinearGradient colors={colors.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coinFill} /> : null}
                  <Text style={[styles.coinText, on && styles.coinTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                    {dollars(m)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.scale}>
            <Text style={styles.scaleText}>Less money</Text>
            <Text style={styles.scaleText}>More money</Text>
          </View>
        </Animated.View>
      ) : null}

      {/* 4) Energy: opens once there's a money answer. */}
      {form.named && form.hours && form.money ? (
        <Animated.View entering={FadeInDown.duration(250)} style={styles.section}>
          <Text style={styles.question}>How does it make you feel?</Text>
          <View style={styles.energyRow}>
            {ENERGY.map((e) => {
              const on = form.energy === e.key;
              return (
                <Pressable
                  key={e.key}
                  onPress={() => pick({ energy: e.key })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={e.label}
                  style={({ pressed }) => [
                    styles.energy,
                    on && { borderColor: colors[e.tone], backgroundColor: colors[`${e.tone}Soft`] },
                    pressed && { opacity: 0.85 },
                  ]}
                >
                  <Ionicons name={e.icon} size={22} color={on ? colors[e.tone] : colors.muted} />
                  <Text style={[styles.energyText, on && { color: colors[e.tone] }]}>{e.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      ) : null}

      {/* 5) Save: once everything is answered. */}
      {complete ? (
        <Animated.View entering={FadeInDown.duration(250)}>
          <Button title="Save & add next" icon="add" onPress={save} style={styles.save} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const COIN = 50;

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
  // Each question that opens sits under a hairline.
  section: { marginTop: spacing.lg - 4, paddingTop: spacing.lg - 4, borderTopWidth: 1, borderTopColor: colors.border },
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
  // Time: a tidy grid of choices.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    width: '30%',
    flexGrow: 1,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceHint: { borderStyle: 'dashed', borderColor: colors.primary },
  choiceText: { fontSize: 15, fontWeight: '700', color: colors.text },
  choiceTextOn: { color: colors.primaryDark },
  // Money: gold coins.
  coins: { flexDirection: 'row', justifyContent: 'space-between' },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.goldLine,
    backgroundColor: colors.surface,
  },
  coinOn: { borderColor: colors.gold[1] },
  coinFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  coinText: { fontSize: 14, fontWeight: '700', color: colors.accentText },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  scaleText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  // Energy: two clear choices.
  energyRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  energy: {
    flex: 1,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  energyText: { fontSize: 15, fontWeight: '800', color: colors.muted },
  save: { marginTop: spacing.lg },
});
