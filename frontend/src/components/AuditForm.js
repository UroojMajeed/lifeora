import { useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { HOUR_OPTIONS, MONEY_LEVELS, dollars, suggestionsFor, usualHours, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const STAGES = ['name', 'hours', 'money', 'energy'];
const ENERGY = [
  { key: 'draining', label: 'Drains me', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes me', icon: 'flash', tone: 'success' },
];
const short = (h) => (h < 1 ? `${h * 60} min` : `${h} ${h === 1 ? 'hour' : 'hours'}`);
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const EMPTY = { name: '', hours: null, money: null, energy: null };

/**
 * The audit's form, one question at a time: the task, then how long it takes a day, then how much
 * money it makes, then how it makes you feel. Picking an answer moves on by itself; the last one adds
 * the task (\`onAdd(task)\`) and the form starts again for the next one.
 */
export default function AuditForm({ role, items = [], onAdd }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [form, setForm] = useState(EMPTY);
  const [stage, setStage] = useState('name');
  const [justAdded, setJustAdded] = useState(null);
  const inputRef = useRef(null);
  const step = STAGES.indexOf(stage);

  const name = form.name.trim();
  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const duplicate = Boolean(name) && taken(name);
  const usual = name ? usualHours(name) : null;
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));

  const go = (to) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStage(to);
  };
  const nextFromName = (value = form.name) => {
    const n = value.trim();
    if (!n || taken(n)) return;
    Keyboard.dismiss();
    setForm((f) => ({ ...f, name: n }));
    setJustAdded(null);
    go('hours');
  };
  const answer = (patch, to) => {
    Haptics.selectionAsync().catch(() => {});
    setForm((f) => ({ ...f, ...patch }));
    go(to);
  };
  const finish = (energy) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onAdd({ activity: name.slice(0, 60), hours: form.hours, per: 'day', money: form.money, value: valueForMoney(form.money), energy });
    setJustAdded(name);
    setForm(EMPTY);
    go('name');
  };

  return (
    <View style={styles.card}>
      {/* Where you are: four small steps, and a way back. */}
      <View style={styles.top}>
        <View style={styles.dots}>
          {STAGES.map((s, i) => (
            <View key={s} style={[styles.dot, i <= step && styles.dotOn]} />
          ))}
        </View>
        {step > 0 ? (
          <Pressable onPress={() => go(STAGES[step - 1])} hitSlop={10} accessibilityRole="button" style={styles.back}>
            <Ionicons name="chevron-back" size={14} color={colors.primary} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
        ) : null}
      </View>

      <Animated.View key={stage} entering={FadeIn.duration(200)}>
        {stage === 'name' ? (
          <>
            {justAdded ? (
              <View style={styles.added}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.addedText} numberOfLines={1}>
                  {justAdded} added. Next task?
                </Text>
              </View>
            ) : null}
            <Text style={styles.question}>What's the task?</Text>
            <TextInput
              ref={inputRef}
              value={form.name}
              onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              onSubmitEditing={() => nextFromName()}
              placeholder="e.g. Invoicing"
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              maxLength={60}
              returnKeyType="next"
              blurOnSubmit={false}
              style={[styles.input, duplicate && styles.inputDuplicate]}
              accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
            />
            {duplicate ? <Text style={styles.warn}>That's already in your routine.</Text> : null}
            {suggestions.length ? (
              <View style={styles.suggestions}>
                {suggestions.slice(0, 6).map((n) => (
                  <Pressable
                    key={n}
                    onPress={() => nextFromName(n)}
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
            <Button title="Next" icon="arrow-forward" onPress={() => nextFromName()} disabled={!name || duplicate} style={styles.next} />
          </>
        ) : null}

        {stage === 'hours' ? (
          <>
            <Text style={styles.question}>
              How long does <Text style={styles.task}>{name}</Text> take a day?
            </Text>
            <View style={styles.grid}>
              {HOUR_OPTIONS.map((h) => {
                const on = form.hours === h;
                const hint = !form.hours && h === usual;
                return (
                  <Pressable
                    key={h}
                    onPress={() => answer({ hours: h }, 'money')}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.choice, (on || hint) && styles.choiceOn, hint && styles.choiceHint, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={[styles.choiceText, on && styles.choiceTextOn]}>{short(h)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {stage === 'money' ? (
          <>
            <Text style={styles.question}>
              How much money does <Text style={styles.task}>{name}</Text> make?
            </Text>
            <View style={styles.coins}>
              {MONEY_LEVELS.map((m) => {
                const on = form.money === m;
                return (
                  <Pressable
                    key={m}
                    onPress={() => answer({ money: m }, 'energy')}
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
          </>
        ) : null}

        {stage === 'energy' ? (
          <>
            <Text style={styles.question}>
              How does <Text style={styles.task}>{name}</Text> make you feel?
            </Text>
            <View style={styles.energyRow}>
              {ENERGY.map((e) => (
                <Pressable
                  key={e.key}
                  onPress={() => finish(e.key)}
                  accessibilityRole="button"
                  accessibilityLabel={e.label}
                  style={({ pressed }) => [
                    styles.energy,
                    { borderColor: colors[e.tone], backgroundColor: colors[`${e.tone}Soft`] },
                    pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] },
                  ]}
                >
                  <Ionicons name={e.icon} size={26} color={colors[e.tone]} />
                  <Text style={[styles.energyText, { color: colors[e.tone] }]}>{e.label}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}

const COIN = 52;

const makeStyles = (colors, isDark) => ({
  card: {
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : colors.primarySoft,
    ...cardShadow(colors, isDark),
  },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 22, marginBottom: spacing.md },
  dots: { flexDirection: 'row', gap: 6 },
  dot: { width: 22, height: 5, borderRadius: 3, backgroundColor: colors.border },
  dotOn: { backgroundColor: colors.primary },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  backText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  added: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  addedText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.success },
  question: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.text, letterSpacing: -0.2, marginBottom: spacing.md },
  task: { color: colors.primaryDark },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  inputDuplicate: { color: colors.error },
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
  next: { marginTop: spacing.lg - 4 },
  // Time: a tidy grid of choices.
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    width: '31%',
    flexGrow: 1,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  choiceOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  choiceHint: { borderStyle: 'dashed', backgroundColor: colors.surface },
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
  // Energy: two big choices.
  energyRow: { flexDirection: 'row', gap: spacing.sm + 2 },
  energy: {
    flex: 1,
    height: 92,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  energyText: { fontSize: 15, fontWeight: '800' },
});
