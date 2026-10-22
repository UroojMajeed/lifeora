import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import StepSlider from './StepSlider';
import { MONEY_CAPTION, MONEY_LEVELS, dollars, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// Time in 15-minute steps up to 8 hours.
const HOURS = Array.from({ length: 32 }, (_, i) => (i + 1) / 4);
const time = (h) => (h < 1 ? `${h * 60} min` : `${h} h`);
const ENERGY = [
  { key: 'draining', label: 'Drains me', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes me', icon: 'flash', tone: 'success' },
];

/**
 * The add-a-task form's three questions, all open at once: how long it takes a day (a slider in
 * 15-minute steps), what it pays (a 5-step $ slider, its meaning in words), and how it feels (two
 * buttons). The rows stretch to the
 * screen's width. `item` is the task so far; `onChange(patch)` sets an answer.
 */
export default function AuditChoices({ item, onChange }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const usual = usualHours(item.activity) || 1;
  const pick = (patch) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(patch);
  };

  return (
    <View style={styles.wrap}>
      {/* How long: a slider in 15-minute steps, the value shown on the right. */}
      <View style={styles.qRow}>
        <Text style={styles.qInline}>How long does it take a day?</Text>
        <Text style={[styles.value, !item.hours && styles.valueIdle]}>{item.hours ? time(item.hours) : 'Drag to set'}</Text>
      </View>
      <StepSlider steps={HOURS} value={item.hours} start={usual} color={colors.primary} label={(v) => `${time(v)} a day`} onChange={(v) => onChange({ hours: v, per: 'day' })} />
      <View style={styles.ends}>
        <Text style={styles.end}>15 min</Text>
        <Text style={styles.end}>8 h</Text>
      </View>

      {/* What it pays: a 5-step slider, its meaning in words. */}
      <View style={styles.qRow}>
        <Text style={styles.qInline}>What does it pay?</Text>
        <Text style={[styles.value, styles.money, !item.money && styles.valueIdle]}>{item.money ? dollars(item.money) : 'Drag to set'}</Text>
      </View>
      <StepSlider steps={MONEY_LEVELS} value={item.money} start={1} color={colors.gold[1]} label={(v) => `${dollars(v)}, ${MONEY_CAPTION[v]}`} onChange={(v) => onChange({ money: v })} />
      <View style={styles.ends}>
        {MONEY_LEVELS.map((m) => (
          <Text key={m} style={[styles.end, item.money === m && styles.endOn]}>
            {dollars(m)}
          </Text>
        ))}
      </View>
      <Text style={styles.scale}>{item.money ? MONEY_CAPTION[item.money] : '$ anyone could do it · $$$$$ only you, big money'}</Text>

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
  qRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: spacing.md + 4 },
  qInline: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.text },
  value: { fontSize: 16, fontWeight: '800', color: colors.primary },
  money: { color: colors.accentText },
  valueIdle: { fontSize: 13, fontWeight: '600', color: colors.muted },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  end: { fontSize: 12, fontWeight: '600', color: colors.muted },
  endOn: { color: colors.accentText, fontWeight: '800' },
  scale: { fontSize: 12, lineHeight: 16, color: colors.muted, marginTop: 6 },
  // Energy: two big buttons, half the width each, the same height as the app's main buttons.
  feels: { flexDirection: 'row', gap: spacing.sm },
  feel: { flex: 1, height: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderRadius: radius.pill, borderWidth: 1.5, backgroundColor: colors.surface },
  feelText: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
});
