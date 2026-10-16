import { useState } from 'react';
import { Keyboard, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
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
const short = (h) => (h < 1 ? `${h * 60}m` : `${h}h`);
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };

/**
 * The audit's form: one task at a time, everything on one card. Its name (typed, or a suggestion),
 * how long it takes a day, how much money it makes ($ to $$$$$) and how it makes you feel. "Save &
 * add next" adds it (\`onAdd(task)\`) and clears the form for the next one.
 */
export default function AuditForm({ role, items = [], onAdd }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const usual = name ? usualHours(name) : null;
  const suggestions = suggestionsFor(role).filter((n) => !taken(n) && !sameName(n, form.name));
  const ready = Boolean(name) && !duplicate && form.hours && form.money && form.energy;
  const missing = [!name && 'name', !form.hours && 'time', !form.money && 'money', !form.energy && 'energy'].filter(Boolean);

  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    set(patch);
  };

  const save = () => {
    if (!ready) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Keyboard.dismiss();
    onAdd({
      activity: name.slice(0, 60),
      hours: form.hours,
      per: 'day',
      money: form.money,
      value: valueForMoney(form.money),
      energy: form.energy,
    });
    setForm(EMPTY);
  };

  return (
    <View style={styles.card}>
      {/* The task */}
      <Text style={styles.label}>What's the task?</Text>
      <TextInput
        value={form.name}
        onChangeText={(t) => set({ name: t })}
        placeholder="e.g. Invoicing"
        placeholderTextColor={colors.muted}
        keyboardAppearance={isDark ? 'dark' : 'light'}
        maxLength={60}
        returnKeyType="done"
        style={[styles.input, duplicate && styles.inputDuplicate]}
        accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
      />
      {duplicate ? <Text style={styles.warn}>That's already in your routine.</Text> : null}
      {suggestions.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.suggestions}>
          {suggestions.slice(0, 12).map((n) => (
            <Pressable
              key={n}
              onPress={() => {
                Keyboard.dismiss();
                pick({ name: n });
              }}
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

      {/* Time a day (the usual time for this task is hinted until you pick) */}
      <Text style={[styles.label, styles.gap]}>How long a day?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
        {HOUR_OPTIONS.map((h) => {
          const on = form.hours === h;
          const hint = !form.hours && h === usual;
          return (
            <Pressable
              key={h}
              onPress={() => pick({ hours: h })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${short(h)} a day`}
              style={[styles.pill, on && styles.pillOn, hint && styles.pillHint]}
            >
              <Text style={[styles.pillText, on && styles.pillTextOn]}>{short(h)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Money it makes */}
      <Text style={[styles.label, styles.gap]}>How much money does it make?</Text>
      <View style={styles.coins}>
        {MONEY_LEVELS.map((m) => {
          const on = form.money === m;
          return (
            <Pressable
              key={m}
              onPress={() => pick({ money: m })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${m} of 5, from less money to more`}
              style={[styles.coin, on && styles.coinOn]}
            >
              {on ? <LinearGradient colors={colors.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.coinFill} /> : null}
              <Text style={[styles.coinText, on && styles.coinTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                {dollars(m)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* How it makes you feel */}
      <Text style={[styles.label, styles.gap]}>How does it make you feel?</Text>
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
              style={[styles.energy, on && { borderColor: colors[e.tone], backgroundColor: colors[`${e.tone}Soft`] }]}
            >
              <Ionicons name={e.icon} size={16} color={on ? colors[e.tone] : colors.muted} />
              <Text style={[styles.energyText, on && { color: colors[e.tone] }]}>{e.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Button
        title={ready ? 'Save & add next' : `Add ${missing.join(', ')}`}
        icon={ready ? 'add' : undefined}
        onPress={save}
        disabled={!ready}
        style={styles.save}
      />
    </View>
  );
}

const COIN = 44;

const makeStyles = (colors, isDark) => ({
  card: {
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : colors.primarySoft,
    ...cardShadow(colors, isDark),
  },
  label: { fontSize: 14, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  gap: { marginTop: spacing.md + 2 },
  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  inputDuplicate: { color: colors.error },
  warn: { fontSize: 13, fontWeight: '600', color: colors.error, marginTop: 6 },
  suggestions: { gap: 6, paddingTop: spacing.sm },
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
  options: { gap: 6 },
  pill: {
    height: 36,
    minWidth: 46,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillHint: { borderStyle: 'dashed', borderColor: colors.primary },
  pillText: { fontSize: 14, fontWeight: '700', color: colors.text },
  pillTextOn: { color: colors.primaryDark },
  coins: { flexDirection: 'row', justifyContent: 'space-between' },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.goldLine,
    backgroundColor: colors.surface,
  },
  coinOn: { borderColor: colors.gold[1] },
  coinFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  coinText: { fontSize: 13, fontWeight: '700', color: colors.accentText },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  energyRow: { flexDirection: 'row', gap: spacing.sm },
  energy: {
    flex: 1,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  energyText: { fontSize: 14, fontWeight: '800', color: colors.muted },
  save: { marginTop: spacing.lg - 4 },
});
