import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, MONEY_CAPTION, MONEY_LEVELS, dollars, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const ENERGY = [
  { key: 'draining', label: 'Drains', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes', icon: 'flash', tone: 'success' },
];
export const FIELDS = ['hours', 'money', 'energy'];

const short = (h) => (h < 1 ? `${h * 60}m` : `${h}h`);

/** A task is audited once it has its time, its money and its energy. */
export const isAudited = (it) => Boolean(it.hours && it.money && it.energy);

/**
 * A task's three buttons, Time, Money and Energy, each in its own colour (teal, gold, green) even
 * before it's set; a set button shows its value. Pressing one opens its choices under the buttons
 * (`field` is the one open). Used on the routine's cards and in the form that adds a task.
 */
export function AuditFields({ item, field, onField, onChange }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const usual = usualHours(item.activity);
  const energy = ENERGY.find((e) => e.key === item.energy);
  // Each button's own colour: [line, soft fill, text].
  const tone = {
    hours: [colors.primary, colors.primarySoft, colors.primaryDark],
    money: [colors.gold[1], colors.accentSoft, colors.accentText],
    energy: energy ? [colors[energy.tone], colors[`${energy.tone}Soft`], colors[energy.tone]] : [colors.success, colors.successSoft, colors.success],
  };

  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(patch);
  };

  // The three buttons: a set one shows its value, an open one is outlined.
  const buttons = [
    { key: 'hours', icon: 'time-outline', text: item.hours ? short(item.hours) : 'Time', set: Boolean(item.hours) },
    { key: 'money', icon: 'cash-outline', text: item.money ? dollars(item.money) : 'Money', set: Boolean(item.money) },
    {
      key: 'energy',
      icon: energy ? energy.icon : 'pulse',
      text: energy ? energy.label : 'Energy',
      set: Boolean(energy),
      tone: energy?.tone,
    },
  ];

  return (
    <>
      <View style={styles.buttons}>
        {buttons.map((b) => {
          const open = field === b.key;
          const [line, soft, ink] = tone[b.key];
          return (
            <Pressable
              key={b.key}
              onPress={() => onField(open ? null : b.key)}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              accessibilityLabel={`${b.key === 'hours' ? 'Time' : b.key === 'money' ? 'Money' : 'Energy'}: ${b.set ? b.text : 'not set'}`}
              style={({ pressed }) => [
                styles.button,
                { borderColor: line, backgroundColor: b.set ? soft : colors.surface },
                open && { backgroundColor: line },
                pressed && { opacity: 0.75 },
              ]}
            >
              <Ionicons name={b.icon} size={15} color={open ? colors.onColor : ink} />
              <Text style={[styles.buttonText, { color: open ? colors.onColor : ink }, b.set && styles.buttonTextSet]} numberOfLines={1}>
                {b.text}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* The open button's choices. */}
      {field === 'hours' ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.choices}>
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
      ) : null}
      {field === 'money' ? (
        <>
          <View style={styles.choices}>
            {MONEY_LEVELS.map((m) => {
              const on = item.money === m;
              return (
                <Pressable
                  key={m}
                  onPress={() => pick({ money: m })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  accessibilityLabel={`${m} of 5: ${MONEY_CAPTION[m]}`}
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
          {/* What the scale means, in plain words: from the least to the most. */}
          <Text style={styles.moneyScale}>
            $ {MONEY_CAPTION[1].toLowerCase()} · $$$$$ {MONEY_CAPTION[5].toLowerCase()}
          </Text>
        </>
      ) : null}
      {field === 'energy' ? (
        <View style={styles.choices}>
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
      ) : null}
    </>
  );
}

/**
 * One task in the time and energy audit: its name, then three buttons (Time, Money, Energy), each in
 * its own colour (teal, gold, green) even before it's set. A set button shows its value; pressing one
 * opens its choices under the buttons (`field` is the one open). Picking calls `onChange(patch)`.
 */
export default function AuditTaskCard({ item, field, onField, onChange, onRemove }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  return (
    <View style={[styles.card, field && styles.cardOpen]}>
      <View style={styles.top}>
        <Text style={styles.name} numberOfLines={1}>
          {item.activity}
        </Text>
        <Pressable onPress={onRemove} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${item.activity}`}>
          <Ionicons name="close-circle" size={20} color={colors.muted} />
        </Pressable>
      </View>

      <AuditFields item={item} field={field} onField={onField} onChange={onChange} />
    </View>
  );
}

const COIN = 38;

const makeStyles = (colors, isDark) => ({
  card: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm + 4,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  cardOpen: { borderColor: colors.primary },
  top: { minHeight: 46, flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  // The three buttons, side by side.
  buttons: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    height: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: radius.pill,
    borderWidth: 1.5,
  },
  buttonText: { fontSize: 13, fontWeight: '700' },
  buttonTextSet: { fontWeight: '800' },
  // The open button's choices.
  choices: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm + 2 },
  pill: {
    height: 34,
    minWidth: 44,
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
  pillText: { fontSize: 13, fontWeight: '700', color: colors.text },
  pillTextOn: { color: colors.primaryDark },
  energy: { flex: 1, flexDirection: 'row', gap: 4 },
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
  moneyScale: { fontSize: 12, fontWeight: '600', color: colors.muted, marginTop: 6 },
});
