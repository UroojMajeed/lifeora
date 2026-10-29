import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * The one real ask to save an account: a card that pops up for guests right after a handover (the
 * proudest moment, and the most to lose). "Not now" closes it for good; the quiet links on Home and Me stay.
 * `hours` is what the handoff gives back each week.
 */
export default function SaveProgressCard({ visible, hours, onSave, onDismiss }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        {visible ? (
          <Animated.View entering={ZoomIn.duration(250)} style={styles.card} accessibilityViewIsModal>
            <View style={styles.icon}>
              <Ionicons name="lock-closed" size={26} color={colors.primary} />
            </View>
            <Text style={styles.kicker}>{hours ? `${hours} a week bought back` : 'Handed over'}</Text>
            <Text style={styles.title}>Keep your progress safe</Text>
            <Text style={styles.body}>Right now it lives only on this phone. Save it to get it back on any phone.</Text>
            <Button title="Save my progress" icon="cloud-upload" onPress={onSave} style={styles.button} />
            <Pressable onPress={onDismiss} hitSlop={8} style={styles.later} accessibilityRole="button">
              <Text style={styles.laterText}>Not now</Text>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => ({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg, backgroundColor: 'rgba(10,23,22,0.55)' },
  card: { width: '100%', maxWidth: 380, alignItems: 'center', padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.surface },
  icon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  kicker: { fontSize: 13, fontWeight: '700', color: colors.accentText, marginTop: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: 4 },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  button: { alignSelf: 'stretch', marginTop: spacing.lg },
  later: { marginTop: spacing.md, paddingVertical: 4 },
  laterText: { fontSize: 15, fontWeight: '600', color: colors.muted },
});
