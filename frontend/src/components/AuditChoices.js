import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, MONEY_CAPTION, MONEY_LEVELS, dollars, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const short = (h) => (h < 1 ? `${h * 60}m` : `${h}h`);
const ENERGY = [
  { key: 'draining', label: 'Drains', icon: 'battery-dead', tone: 'error' },
  { key: 'energizing', label: 'Energizes', icon: 'flash', tone: 'success' },
];

/**
 * The add-a-task questions, stacked: each question on its own line with its options full width under
 * it (how long, what it pays, how it feels), a thin line between them. One tap each. The time pills
 * wrap onto two lines (nothing to scroll sideways); the pay line shows what the pick means.
 * `item` is the task so far; `onChange(patch)` sets an answer.
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
    <View style={styles.wrapTop}>
      {/* How long */}
      <Text style={styles.question}>How long, a day?</Text>
      <View style={styles.wrap}>
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
              hitSlop={4}
              style={[styles.pill, on && styles.hourOn, hint && styles.hint]}
            >
              <Text style={[styles.pillText, on && styles.textOn]}>{short(h)}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rule} />

      {/* What it pays: fills like a rating up to your pick, its meaning on the right. */}
      <View style={styles.questionRow}>
        <Text style={[styles.question, styles.questionInRow]}>What does it pay?</Text>
        {item.money ? <Text style={styles.caption}>{MONEY_CAPTION[item.money]}</Text> : null}
      </View>
      <View style={styles.row}>
        {MONEY_LEVELS.map((m) => {
          const on = item.money === m;
          const under = Boolean(item.money) && m < item.money;
          return (
            <Pressable
              key={m}
              onPress={() => pick({ money: m })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={`${dollars(m)}: ${MONEY_CAPTION[m]}`}
              hitSlop={4}
              style={[styles.pill, styles.coin, under && styles.coinUnder, on && styles.coinOn]}
            >
              {on ? <LinearGradient colors={colors.gold} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.fill} /> : null}
              <Text style={[styles.coinText, on && styles.coinTextOn]} numberOfLines={1} adjustsFontSizeToFit>
                {dollars(m)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.rule} />

      {/* How it feels */}
      <Text style={styles.question}>How does it feel?</Text>
      <View style={styles.row}>
        {ENERGY.map((e) => {
          const on = item.energy === e.key;
          return (
            <Pressable
              key={e.key}
              onPress={() => pick({ energy: e.key })}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              accessibilityLabel={e.key === 'draining' ? 'Drains me' : 'Energizes me'}
              hitSlop={4}
              style={[styles.pill, styles.feel, { borderColor: colors[e.tone] }, on && { backgroundColor: colors[e.tone] }]}
            >
              <Ionicons name={e.icon} size={15} color={on ? colors.onColor : colors[e.tone]} />
              <Text style={[styles.pillText, { color: on ? colors.onColor : colors[e.tone] }]}>{e.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// Questions 14 in sentence case, 8 above their options; a hairline with 16 above and below between
// questions. Options: 36-tall pills (48 touch areas with hitSlop), Feel 40 tall.
const makeStyles = (colors) => ({
  wrapTop: { marginTop: spacing.lg },
  question: { fontSize: 14, lineHeight: 20, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  questionRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  questionInRow: { marginBottom: 0 },
  caption: { fontSize: 13, fontWeight: '700', color: colors.accentText },
  rule: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  row: { flexDirection: 'row', gap: 6 },
  pill: { height: 36, minWidth: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: colors.text },
  textOn: { color: colors.onColor, fontWeight: '800' },
  hourOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  hint: { borderStyle: 'dashed', borderColor: colors.primary },
  // Pay
  coin: { flex: 1, minWidth: 0, paddingHorizontal: 2, overflow: 'hidden', borderColor: colors.goldLine },
  coinUnder: { borderColor: colors.gold[0], backgroundColor: colors.accentSoft },
  coinOn: { borderColor: colors.gold[1] },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coinText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: colors.accentText },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  // Feel
  feel: { flex: 1, height: 40, flexDirection: 'row', gap: 5 },
});
