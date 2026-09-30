import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, radius, spacing, type } from '../theme';
import { TOTAL_STEPS } from '../constants/content';

/** Back button + progress bar + heading for each onboarding step. */
export default function StepHeader({ step, eyebrow, title, subtitle, showBack = true }) {
  const navigation = useNavigation();
  const canGoBack = showBack && navigation.canGoBack();
  const progress = Math.min(step / TOTAL_STEPS, 1);

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {canGoBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={styles.back}
          >
            <Text style={styles.backText}>‹ Back</Text>
          </Pressable>
        ) : (
          <View style={styles.back} />
        )}
        <Text style={styles.count}>
          Step {step} of {TOTAL_STEPS}
        </Text>
      </View>

      <View style={styles.track} accessibilityRole="progressbar" accessibilityValue={{ now: step, min: 0, max: TOTAL_STEPS }}>
        <View style={[styles.fill, { width: `${progress * 100}%` }]} />
      </View>

      {eyebrow ? <Text style={[type.label, styles.eyebrow]}>{eyebrow}</Text> : null}
      <Text style={type.title}>{title}</Text>
      {subtitle ? <Text style={[type.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: spacing.sm, marginBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 36 },
  back: { minWidth: 60 },
  backText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  count: { fontSize: 13, fontWeight: '600', color: colors.muted },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },
  eyebrow: { color: colors.accent, marginBottom: spacing.xs },
  subtitle: { marginTop: spacing.sm },
});
