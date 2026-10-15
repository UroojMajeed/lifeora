import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, MONEY_LEVELS, dollars, hoursLabel, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const ENERGY = [
  { key: 'draining', label: 'Drains me', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes me', icon: 'flash', tone: 'success' },
];

/** A task is audited once it has its time, its money and its energy. */
export const isAudited = (it) => Boolean(it.hours && it.money && it.energy);

/**
 * One task in the time and energy audit, everything set right on its card: how long it takes a day,
 * how much money it makes ($ to $$$$$) and whether it drains or energizes you. Open, it shows the three
 * rows of choices; folded, one line with what's picked (or what's still missing). Picking calls
 * `onChange(patch)`.
 */
export default function AuditTaskCard({ item, open, onToggle, onChange, onRemove }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const done = isAudited(item);
  const usual = usualHours(item.activity);
  const missing = [!item.hours && 'time', !item.money && 'money', !item.energy && 'energy'].filter(Boolean);
  const energy = ENERGY.find((e) => e.key === item.energy);

  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(patch);
  };

  return (
    <View style={[styles.card, open && styles.cardOpen]}>
      <View style={styles.top}>
        <Pressable
          onPress={onToggle}
          accessibilityRole="button"
          accessibilityState={{ expanded: open }}
          accessibilityLabel={`${item.activity}. ${done ? 'Audited' : `Still to set: ${missing.join(', ')}`}. Tap to ${open ? 'fold' : 'open'}.`}
          style={({ pressed }) => [styles.head, pressed && { opacity: 0.6 }]}
        >
          {done ? <Ionicons name="checkmark-circle" size={20} color={colors.success} /> : null}
          <Text style={styles.name} numberOfLines={1}>
            {item.activity}
          </Text>
          {/* Folded: what's picked, in one line (or what's still missing). */}
          {!open ? (
            done ? (
              <Text style={styles.summary} numberOfLines={1}>
                {hoursLabel(item.hours)} · <Text style={styles.summaryMoney}>{dollars(item.money)}</Text> ·{' '}
                <Ionicons name={energy.icon} size={13} color={colors[energy.tone]} />
              </Text>
            ) : (
              <View style={styles.todo}>
                <Text style={styles.todoText}>Set {missing.join(', ')}</Text>
              </View>
            )
          ) : null}
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activity}`}>
          <Ionicons name="close-circle" size={22} color={colors.muted} />
        </Pressable>
      </View>

      {open ? (
        <View style={styles.body}>
          {/* Time: how long a day (the usual time for this task is highlighted until you pick). */}
          <View style={styles.rowHead}>
            <Ionicons name="time-outline" size={15} color={colors.primary} />
            <Text style={styles.rowLabel}>How long a day?</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
            {HOUR_OPTIONS.map((h) => {
              const on = h === item.hours;
              const hint = !item.hours && h === usual;
              return (
                <Pressable
                  key={h}
                  onPress={() => pick({ hours: h, per: 'day' })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${hoursLabel(h)} a day`}
                  style={({ pressed }) => [styles.chip, (on || hint) && styles.chipOn, hint && styles.chipHint, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{hoursLabel(h)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Money: how much it makes, as gold coins from least to most. */}
          <View style={styles.rowHead}>
            <Ionicons name="cash-outline" size={15} color={colors.accentText} />
            <Text style={styles.rowLabel}>How much money does it make?</Text>
          </View>
          <View style={styles.coins}>
            {MONEY_LEVELS.map((m) => {
              const on = item.money === m;
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

          {/* Energy: does it drain you or give you energy? */}
          <View style={styles.rowHead}>
            <Ionicons name="pulse" size={15} color={colors.success} />
            <Text style={styles.rowLabel}>How does it make you feel?</Text>
          </View>
          <View style={styles.energyRow}>
            {ENERGY.map((e) => {
              const on = item.energy === e.key;
              return (
                <Pressable
                  key={e.key}
                  onPress={() => pick({ energy: e.key })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={e.label}
                  style={({ pressed }) => [
                    styles.energy,
                    { borderColor: on ? colors[e.tone] : colors.border, backgroundColor: on ? colors[`${e.tone}Soft`] : colors.surface },
                    pressed && { opacity: 0.8 },
                  ]}
                >
                  <Ionicons name={e.icon} size={16} color={on ? colors[e.tone] : colors.muted} />
                  <Text style={[styles.energyText, { color: on ? colors[e.tone] : colors.muted }]}>{e.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}
    </View>
  );
}

const COIN = 42;

const makeStyles = (colors, isDark) => ({
  card: {
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  cardOpen: { borderColor: colors.primary },
  top: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  head: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  summary: { marginLeft: 'auto', fontSize: 13, fontWeight: '700', color: colors.muted },
  summaryMoney: { color: colors.accentText, fontWeight: '800' },
  todo: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  todoText: { fontSize: 12, fontWeight: '700', color: colors.accentText },
  body: { paddingBottom: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  rowHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, marginBottom: spacing.sm },
  rowLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  chips: { gap: spacing.sm },
  chip: {
    minWidth: 60,
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  chipHint: { borderStyle: 'dashed', backgroundColor: colors.surface },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
  chipTextOn: { color: colors.primaryDark },
  coins: { flexDirection: 'row', justifyContent: 'space-between' },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  coinOn: { borderColor: colors.gold[1], transform: [{ scale: 1.08 }] },
  coinFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  coinText: { fontSize: 13, fontWeight: '700', color: colors.muted },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  scale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  scaleText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  energyRow: { flexDirection: 'row', gap: spacing.sm },
  energy: {
    flex: 1,
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  energyText: { fontSize: 14, fontWeight: '800' },
});
