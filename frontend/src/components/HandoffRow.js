import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DRIP } from '../constants/content';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { formatDay, journeyOf, startsLater } from '../constants/journey';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

/** Where a handoff stands, as the row's pill: handed off, on its way, kept for later, or not started. */
export function rowStatus(item) {
  if (startsLater(item)) return 'starting';
  if (item.status === 'done') return 'done';
  if (item.status === 'later') return 'later';
  if (item.cameBackAt) return 'back';
  return journeyOf(item).doneCount ? 'going' : 'todo';
}
const PILLS = {
  done: { label: 'Handed off', icon: 'checkmark-circle', fg: 'success', bg: 'successSoft' },
  going: { label: 'Handing off', icon: 'swap-horizontal', fg: 'warm', bg: 'warmSoft' },
  starting: { label: 'Starts', icon: 'calendar-outline', fg: 'info', bg: 'infoSoft' },
  back: { label: 'Came back', icon: 'refresh', fg: 'accentText', bg: 'accentSoft' },
  later: { label: 'Next round', icon: 'time-outline', fg: 'muted', bg: 'tintWaiting' },
  todo: { label: 'Not started', icon: null, fg: 'muted', bg: 'surfaceAlt' },
};

/**
 * One draining task in the handoff list: a coloured edge for its quadrant, its name and a status
 * pill, then hours and a step bar (or, once handed off, the hours it gives back each week).
 */
export default function HandoffRow({ item, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const quadrant = DRIP[item.quadrant];
  const state = rowStatus(item);
  const pill = state === 'starting' ? { ...PILLS.starting, label: `Starts ${formatDay(item.startDate).split(',')[0]}` } : PILLS[state];
  const done = state === 'done';
  const { steps, doneCount } = journeyOf(item);
  const meta = state === 'starting' ? `+${formatHours(item.hours * WORKDAYS_PER_WEEK)}\u00A0a\u00A0week from\u00A0${formatDay(item.startDate)}` : done ? `+${formatHours(item.hours * WORKDAYS_PER_WEEK)}\u00A0a\u00A0week back` : `${formatHours(item.hours)}\u00A0a\u00A0day · ${doneCount}/${steps.length}\u00A0steps`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${item.activity}, ${quadrant.name}, ${pill.label}, ${meta.replace(/\u00A0/g, ' ')}. Open.`}
      style={({ pressed }) => [styles.card, { borderLeftColor: done ? colors.success : colors.chart[item.quadrant] }, done && styles.cardDone, pressed && { opacity: 0.85 }]}
    >
      <View style={styles.middle}>
        <View style={styles.top}>
          <Text style={styles.title} numberOfLines={1}>
            {item.activity}
          </Text>
          <View style={[styles.pill, { backgroundColor: colors[pill.bg] }]}>
            {pill.icon ? <Ionicons name={pill.icon} size={12} color={colors[pill.fg]} /> : null}
            <Text style={[styles.pillText, { color: colors[pill.fg] }]}>{pill.label}</Text>
          </View>
        </View>
        <Text style={[styles.meta, done && styles.metaDone]}>{meta}</Text>
        {!done && state !== 'starting' && steps.length ? (
          <View style={styles.bar}>
            {steps.map((s) => (
              <View key={s.key} style={[styles.seg, s.done && styles.segOn]} />
            ))}
          </View>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.muted} />
    </Pressable>
  );
}

const makeStyles = (colors, isDark) => ({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    ...cardShadow(colors, isDark),
  },
  cardDone: { backgroundColor: colors.tintReinvest },
  middle: { flex: 1, gap: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: { flex: 1, fontSize: 16, fontWeight: '700', color: colors.text },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: '700' },
  meta: { fontSize: 12, color: colors.muted },
  metaDone: { fontWeight: '700', color: colors.success },
  bar: { flexDirection: 'row', gap: 3, marginTop: 4 },
  seg: { flex: 1, height: 4, borderRadius: 2, backgroundColor: colors.border },
  segOn: { backgroundColor: colors.primary },
});
