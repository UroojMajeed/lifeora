import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, MONEY_CAPTION, MONEY_LEVELS, dollars, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const short = (h) => (h < 1 ? `${h * 60}m` : `${h}h`);
const ENERGY = [
  { key: 'draining', label: 'Drains me', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes me', icon: 'flash', tone: 'success' },
];

/**
 * The add-a-task form's three questions, all open at once (one tap each, no buttons to open first):
 * how long it takes a day, what it pays ($ to $$$$$), and how it feels. The rows stretch to the
 * screen's width. `item` is the task so far; `onChange(patch)` sets an answer.
 */
export default function AuditChoices({ item, onChange }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const usual = usualHours(item.activity);
  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(patch);
  };

  return (
    <View style={styles.wrap}>
      {/* How long */}
      <Text style={styles.q}>How long does it take a day?</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.edge} contentContainerStyle={styles.hours}>
        {HOUR_OPTIONS.map((h) => {
          const on = h === item.hours;
          const hint = !item.hours && h === usual;
          return (
            <Pressable
              key={h}
              onPress={() => pick({ hours: h, per: 'day' })}
              accessibilityRole="radio"
              hitSlop={4}
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${short(h)} a day`}
              style={[styles.hour, on && styles.hourOn, hint && styles.hourHint]}
            >
              <Text style={[styles.hourText, on && styles.textOn]}>{short(h)}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* What it pays */}
      <Text style={styles.q}>What does it pay?</Text>
      <View style={styles.coins}>
        {MONEY_LEVELS.map((m) => {
          const on = item.money === m;
          return (
            <Pressable
              key={m}
              onPress={() => pick({ money: m })}
              accessibilityRole="radio"
              hitSlop={4}
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${m} of 5: ${MONEY_CAPTION[m]}`}
              style={[styles.coin, on && styles.coinOn]}
            >
              {on ? <LinearGradient colors={colors.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} /> : null}
              <Text style={[styles.coinText, on && styles.coinTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                {dollars(m)}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.scale}>
        $ {MONEY_CAPTION[1].toLowerCase()} · $$$$$ {MONEY_CAPTION[5].toLowerCase()}
      </Text>

      {/* How it feels */}
      <Text style={styles.q}>How does it feel?</Text>
      <View style={styles.feels}>
        {ENERGY.map((e) => {
          const on = item.energy === e.key;
          return (
            <Pressable
              key={e.key}
              onPress={() => pick({ energy: e.key })}
              accessibilityRole="radio"
              hitSlop={4}
              accessibilityState={{ checked: on }}
              accessibilityLabel={e.label}
              style={[styles.feel, { borderColor: colors[e.tone] }, on && { backgroundColor: colors[e.tone] }]}
            >
              <Ionicons name={e.icon} size={17} color={on ? colors.onColor : colors[e.tone]} />
              <Text style={[styles.feelText, { color: on ? colors.onColor : colors[e.tone] }]}>{e.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// The app's system: type scale (15 questions, 14 options, 12 helper line, with line heights), an
// 8-point spacing grid and pill shapes like every other button. Options look compact (40-44 tall)
// while hitSlop keeps each touch area at 48.
const makeStyles = (colors) => ({
  wrap: { marginTop: spacing.sm },
  q: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.text, marginTop: spacing.md + 4, marginBottom: spacing.sm },
  // Hours: one line, edge to edge (scroll for more).
  edge: { marginHorizontal: -spacing.lg },
  hours: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  hour: { height: 40, minWidth: 54, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  hourOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  hourHint: { borderStyle: 'dashed', borderColor: colors.primary },
  hourText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: colors.text },
  textOn: { color: colors.onColor, fontWeight: '800' },
  // Money: five coins across the width.
  coins: { flexDirection: 'row', gap: spacing.sm },
  coin: {
    flex: 1,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: colors.gold[1],
    backgroundColor: colors.accentSoft,
  },
  coinOn: { borderWidth: 2 },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coinText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: colors.accentText },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  scale: { fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 6 },
  // Energy: two big buttons, half the width each, the same height as the app's main buttons.
  feels: { flexDirection: 'row', gap: spacing.sm },
  feel: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.pill, borderWidth: 1.5, backgroundColor: colors.surface },
  feelText: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
});
