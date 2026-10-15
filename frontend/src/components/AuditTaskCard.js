import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, MONEY_LEVELS, dollars, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const ENERGY = [
  { key: 'draining', label: 'Drains', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes', icon: 'flash', tone: 'success' },
];

const short = (h) => (h < 1 ? `${h * 60}m` : `${h}h`);

/** A task is audited once it has its time, its money and its energy. */
export const isAudited = (it) => Boolean(it.hours && it.money && it.energy);

/**
 * One task in the time and energy audit, kept brief: three short rows on one card (Time, Money,
 * Energy), small choices and no extra words. Folded, it's one line saying what's still to set.
 * Picking calls `onChange(patch)`.
 */
export default function AuditTaskCard({ item, open, onToggle, onChange, onRemove }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const usual = usualHours(item.activity);
  const missing = [!item.hours && 'time', !item.money && 'money', !item.energy && 'energy'].filter(Boolean);

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
          accessibilityLabel={`${item.activity}. ${missing.length ? `Still to set: ${missing.join(', ')}` : 'All set'}.`}
          style={({ pressed }) => [styles.head, pressed && { opacity: 0.6 }]}
        >
          <Text style={styles.name} numberOfLines={1}>
            {item.activity}
          </Text>
          {!open && missing.length ? <Text style={styles.todo}>Set {missing.join(', ')}</Text> : null}
        </Pressable>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activity}`}>
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      </View>

      {open ? (
        <View style={styles.body}>
          {/* Time a day */}
          <View style={styles.row}>
            <Text style={styles.label}>Time</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.options}>
              {HOUR_OPTIONS.map((h) => {
                const on = h === item.hours;
                const hint = !item.hours && h === usual;
                return (
                  <Pressable
                    key={h}
                    onPress={() => pick({ hours: h, per: 'day' })}
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
          </View>

          {/* Money it makes, $ to $$$$$ (gold when picked) */}
          <View style={styles.row}>
            <Text style={styles.label}>Money</Text>
            <View style={styles.options}>
              {MONEY_LEVELS.map((m) => {
                const on = item.money === m;
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
          </View>

          {/* Energy: drains or energizes */}
          <View style={styles.row}>
            <Text style={styles.label}>Energy</Text>
            <View style={styles.options}>
              {ENERGY.map((e) => {
                const on = item.energy === e.key;
                return (
                  <Pressable
                    key={e.key}
                    onPress={() => pick({ energy: e.key })}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    accessibilityLabel={e.key === 'draining' ? 'Drains me' : 'Energizes me'}
                    style={[styles.pill, styles.energy, on && { borderColor: colors[e.tone], backgroundColor: colors[`${e.tone}Soft`] }]}
                  >
                    <Ionicons name={e.icon} size={14} color={on ? colors[e.tone] : colors.muted} />
                    <Text style={[styles.pillText, on && { color: colors[e.tone] }]}>{e.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const COIN = 34;
const LABEL = 56;

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
  top: { minHeight: 50, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  head: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, alignSelf: 'stretch' },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  todo: { marginLeft: 'auto', fontSize: 12, fontWeight: '700', color: colors.accentText },
  body: { paddingBottom: spacing.sm + 4, gap: spacing.sm + 2 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { width: LABEL, fontSize: 12, fontWeight: '700', color: colors.muted },
  options: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: {
    height: 32,
    minWidth: 40,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pillOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  pillHint: { borderStyle: 'dashed', borderColor: colors.primary },
  pillText: { fontSize: 13, fontWeight: '700', color: colors.text },
  pillTextOn: { color: colors.primaryDark },
  energy: { flexDirection: 'row', gap: 4 },
  coin: {
    width: COIN,
    height: COIN,
    borderRadius: COIN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  coinOn: { borderColor: colors.gold[1] },
  coinFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  coinText: { fontSize: 12, fontWeight: '700', color: colors.muted },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
});
