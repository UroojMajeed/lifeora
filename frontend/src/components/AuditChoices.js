import { Pressable, ScrollView, Text, View } from 'react-native';
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
 * The add-a-task questions as three rows, straight on the page (no card): a short label on the left
 * (Time, Pay, Feel) and the options on the right, with a thin line between rows. One tap each.
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
    <View>
      {/* Time */}
      <View style={styles.row}>
        <Text style={styles.label}>Time</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" style={styles.options} contentContainerStyle={styles.line}>
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
        </ScrollView>
      </View>

      {/* Pay: fills like a rating up to your pick. */}
      <View style={styles.row}>
        <Text style={styles.label}>Pay</Text>
        <View style={[styles.options, styles.coins]}>
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
      </View>

      {/* Feel */}
      <View style={[styles.row, styles.last]}>
        <Text style={styles.label}>Feel</Text>
        <View style={[styles.options, styles.feels]}>
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
    </View>
  );
}

// Clean rows: 12 caps labels in a fixed column, 14 options in 36-tall pills (48 touch areas with
// hitSlop), 16 above and below each row, a hairline between rows.
const LABEL = 52;
const makeStyles = (colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  last: { borderBottomWidth: 0 },
  label: { width: LABEL, fontSize: 12, fontWeight: '800', color: colors.muted, letterSpacing: 0.8, textTransform: 'uppercase' },
  options: { flex: 1 },
  line: { gap: 6, paddingRight: spacing.sm },
  pill: { height: 36, minWidth: 48, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface },
  pillText: { fontSize: 14, lineHeight: 18, fontWeight: '700', color: colors.text },
  textOn: { color: colors.onColor, fontWeight: '800' },
  hourOn: { borderColor: colors.primary, backgroundColor: colors.primary },
  hint: { borderStyle: 'dashed', borderColor: colors.primary },
  // Pay
  coins: { flexDirection: 'row', gap: 6 },
  coin: { flex: 1, minWidth: 0, paddingHorizontal: 2, overflow: 'hidden', borderColor: colors.goldLine },
  coinUnder: { borderColor: colors.gold[0], backgroundColor: colors.accentSoft },
  coinOn: { borderColor: colors.gold[1] },
  fill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  coinText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: colors.accentText },
  coinTextOn: { color: colors.goldInk, fontWeight: '800' },
  // Feel
  feels: { flexDirection: 'row', gap: 6 },
  feel: { flex: 1, flexDirection: 'row', gap: 5 },
});
