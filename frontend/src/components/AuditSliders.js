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
  { key: 'draining', label: 'Drains', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes', icon: 'flash', tone: 'success' },
];

/**
 * The add-a-task questions as modern controls: how long (a slider in 15-minute steps, the value shown
 * big on the right), what it pays (a 5-step $ slider, its meaning in words under it), and how it feels
 * (one two-way toggle). `item` is the task so far; `onChange(patch)` sets an answer.
 */
export default function AuditSliders({ item, onChange }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const usual = usualHours(item.activity) || 1;

  return (
    <View>
      {/* How long */}
      <View style={styles.qRow}>
        <Text style={styles.q}>How long a day?</Text>
        <Text style={[styles.value, !item.hours && styles.valueIdle]}>{item.hours ? time(item.hours) : 'Drag to set'}</Text>
      </View>
      <StepSlider steps={HOURS} value={item.hours} start={usual} color={colors.primary} label={(v) => `${time(v)} a day`} onChange={(v) => onChange({ hours: v, per: 'day' })} />
      <View style={styles.ends}>
        <Text style={styles.end}>15 min</Text>
        <Text style={styles.end}>8 h</Text>
      </View>

      {/* What it pays */}
      <View style={[styles.qRow, styles.gap]}>
        <Text style={styles.q}>What does it pay?</Text>
        <Text style={[styles.value, styles.money, !item.money && styles.valueIdle]}>{item.money ? dollars(item.money) : 'Drag to set'}</Text>
      </View>
      <StepSlider steps={MONEY_LEVELS} value={item.money} start={1} color={colors.gold[1]} label={(v) => `${dollars(v)}, ${MONEY_CAPTION[v]}`} onChange={(v) => onChange({ money: v })} />
      <View style={styles.ends}>
        {MONEY_LEVELS.map((m) => (
          <Text key={m} style={[styles.tick, item.money === m && styles.tickOn]}>
            {dollars(m)}
          </Text>
        ))}
      </View>
      <Text style={styles.meaning}>{item.money ? MONEY_CAPTION[item.money] : '$ anyone could do it · $$$$$ only you'}</Text>

      {/* How it feels */}
      <Text style={[styles.q, styles.gap]}>How does it feel?</Text>
      <View style={styles.toggle} accessibilityRole="radiogroup">
        {ENERGY.map((e) => {
          const on = item.energy === e.key;
          return (
            <Pressable
              key={e.key}
              onPress={() => {
                Haptics.selectionAsync().catch(() => {});
                onChange({ energy: e.key });
              }}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              hitSlop={4}
              style={[styles.half, on && { backgroundColor: colors[e.tone] }]}
            >
              <Ionicons name={e.icon} size={17} color={on ? colors.onColor : colors[e.tone]} />
              <Text style={[styles.halfText, { color: on ? colors.onColor : colors[e.tone] }]}>{e.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = (colors) => ({
  gap: { marginTop: spacing.md + 4 },
  qRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  q: { fontSize: 15, lineHeight: 20, fontWeight: '800', color: colors.text },
  value: { fontSize: 18, fontWeight: '800', color: colors.primary },
  money: { color: colors.accentText },
  valueIdle: { fontSize: 13, fontWeight: '600', color: colors.muted },
  ends: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -2 },
  end: { fontSize: 12, color: colors.muted },
  tick: { fontSize: 12, fontWeight: '700', color: colors.muted },
  tickOn: { color: colors.accentText },
  meaning: { fontSize: 13, color: colors.muted, marginTop: 6 },
  // One two-way toggle
  toggle: { flexDirection: 'row', marginTop: spacing.sm, padding: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  half: { flex: 1, height: 40, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: radius.pill },
  halfText: { fontSize: 14, fontWeight: '800' },
});
