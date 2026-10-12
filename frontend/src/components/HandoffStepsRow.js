import { Pressable, Text, View } from 'react-native';
import { checkInDate, formatDay, handoffSteps, nextStep, waitingForCheckIn } from '../constants/handoffSteps';
import { useStyles } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** Step dots: filled for done steps, the current one ringed. */
export function StepDots({ steps, size = 8 }) {
  const styles = useStyles(makeStyles);
  const current = steps.findIndex((s) => !s.done);
  return (
    <View style={styles.dots}>
      {steps.map((s, i) => (
        <View
          key={s.key}
          style={[
            styles.dot,
            { width: size, height: size, borderRadius: size / 2 },
            s.done && styles.dotDone,
            i === current && styles.dotCurrent,
          ]}
        />
      ))}
    </View>
  );
}

/**
 * One task you're handing off, on Home: its name, step dots, and where you are ("Step 3 of 5 ·
 * Write the playbook"), with Continue to pick up right there. In its first week after handover
 * there's nothing to do but wait, so it says when to check in instead of offering a button.
 */
export default function HandoffStepsRow({ handoff, onOpen, style }) {
  const styles = useStyles(makeStyles);
  const steps = handoffSteps(handoff);
  const next = nextStep(handoff);
  const index = steps.findIndex((s) => !s.done);
  const waiting = waitingForCheckIn(handoff);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`${handoff.activity}: step ${index + 1} of ${steps.length}, ${next?.label}. ${waiting ? 'Waiting for the check-in.' : 'Continue.'}`}
      style={({ pressed }) => [styles.row, style, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={styles.name} numberOfLines={1}>
            {handoff.activity}
          </Text>
          <StepDots steps={steps} />
        </View>
        <Text style={styles.step} numberOfLines={1}>
          {waiting ? `Check in on ${formatDay(checkInDate(handoff))}` : `Step ${index + 1} of ${steps.length} · ${next?.label}`}
        </Text>
      </View>
      {waiting ? null : (
        <View style={styles.action}>
          <Text style={styles.actionText}>Continue</Text>
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, minHeight: 52 },
  text: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: colors.text },
  step: { fontSize: 13, color: colors.muted, marginTop: 2 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { backgroundColor: colors.border },
  dotDone: { backgroundColor: colors.primary },
  dotCurrent: { backgroundColor: 'transparent', borderWidth: 2, borderColor: colors.primary },
  action: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.primary },
  actionText: { fontSize: 13, fontWeight: '700', color: colors.onColor },
});
