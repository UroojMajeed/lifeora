import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import Button from './Button';
import { LOOP_STEPS } from '../constants/home';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * One small, specific next step (from todaysMove()), with a single button to do it.
 * The main action on Home, so it carries the apricot spark (a shape, never text).
 */
export default function TodaysMoveCard({ move, note, onPress, loading, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  if (!move) return null;
  const stage = LOOP_STEPS.find((s) => s.key === move.stage);
  const roundDone = move.action === 'nextRound';

  return (
    <Card style={[styles.card, style]}>
      <View style={styles.stripe} />
      <View style={styles.top}>
        <View style={styles.pill}>
          <Ionicons name={roundDone ? 'trophy' : 'flag'} size={12} color={colors.primaryDark} />
          <Text style={styles.pillText}>{roundDone ? 'Round complete' : `${stage?.label} step`}</Text>
        </View>
        {move.minutes ? (
          <View style={styles.time}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={styles.meta}>{move.minutes} min</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.body}>
        <View style={styles.icon}>
          <Ionicons name={move.icon} size={24} color={colors.accentText} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{move.title}</Text>
          <Text style={styles.text}>{move.body}</Text>
        </View>
      </View>
      {/* What it's worth: the hours it frees and what to pay for it (the Buyback Rate). */}
      {note ? (
        <View style={styles.note}>
          <Ionicons name="cash-outline" size={15} color={colors.accentText} />
          <Text style={styles.noteText}>{note}</Text>
        </View>
      ) : null}
      <Button title={move.cta} icon="arrow-forward" onPress={onPress} loading={loading} style={styles.button} />
    </Card>
  );
}

const makeStyles = (colors) => ({
  card: { paddingLeft: spacing.md + 8 },
  // Inset bar (not clipped by overflow, which would hide the card's shadow on iOS).
  stripe: {
    position: 'absolute',
    left: 0,
    top: spacing.lg,
    bottom: spacing.lg,
    width: 5,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
    backgroundColor: colors.accent,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  pillText: { fontSize: 12, fontWeight: '700', color: colors.primaryDark },
  time: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  meta: { fontSize: 12, fontWeight: '600', color: colors.muted },
  body: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.md, alignItems: 'flex-start' },
  icon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3 },
  text: { fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: 4 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.md,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 7,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
  },
  noteText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.accentText },
  button: { marginTop: spacing.md + 4 },
});
