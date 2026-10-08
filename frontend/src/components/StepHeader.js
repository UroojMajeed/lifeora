import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ThemeToggle from './ThemeToggle';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';
import { STEPS, TOTAL_STEPS, resetTo } from '../constants/content';

/**
 * Back button, segmented progress, theme toggle, and the step's heading.
 * With `editing` (changing an answer after onboarding) there is no progress bar and back just closes.
 */
export default function StepHeader({ step, eyebrow, title, subtitle, smallSubtitle = false, showBack = true, onBack, editing = false }) {
  const navigation = useNavigation();
  const { colors, type } = useTheme();
  const styles = useStyles(makeStyles);
  // After resuming straight onto a later step there is nothing behind it, so go to the previous step instead.
  // Step 1 goes back to the journey screen (the road map shown before it).
  const previous = step > 1 ? STEPS[step - 2]?.screen : editing ? null : 'Journey';
  const goBack =
    onBack ||
    (() => {
      if (navigation.canGoBack()) navigation.goBack();
      else if (previous) navigation.reset(resetTo(previous));
      // Opened from the app with nothing behind it (e.g. after a reload): close back to the tabs.
      else if (editing) navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    });
  const canGoBack = Boolean(onBack) || editing || (showBack && (navigation.canGoBack() || Boolean(previous)));

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {canGoBack ? (
          <Pressable
            onPress={goBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <View style={styles.spacer} />
        )}

        {editing ? (
          <View style={styles.segments} />
        ) : (
          <View
            style={styles.segments}
            accessibilityRole="progressbar"
            accessibilityLabel={`Step ${step} of ${TOTAL_STEPS}`}
            accessibilityValue={{ now: step, min: 0, max: TOTAL_STEPS }}
          >
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
              <View key={i} style={[styles.segment, i < step && styles.segmentOn]} />
            ))}
          </View>
        )}

        <ThemeToggle />
      </View>

      {eyebrow ? <Text style={[type.label, styles.eyebrow]}>{eyebrow}</Text> : null}
      <Text style={type.title}>{title}</Text>
      {subtitle ? <Text style={[smallSubtitle ? type.small : type.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { paddingTop: spacing.sm, marginBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  spacer: { width: 40 },
  segments: { flex: 1, flexDirection: 'row', gap: 6 },
  segment: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  segmentOn: { backgroundColor: colors.primary },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  subtitle: { marginTop: spacing.sm },
});
