import { Modal, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * A card that pops up over a dimmed screen for one clear ask (save your progress, turn on reminders):
 * an icon, an optional line above the title, a short reason (and an optional warning note), one button,
 * and "Not now" (or dismissLabel, e.g. "Cancel").
 */
export default function PopupCard({ visible, icon, kicker, title, body, note, action, actionIcon, onAction, onDismiss, dismissLabel = 'Not now', busy }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onDismiss}>
      <View style={styles.backdrop}>
        {visible ? (
          <Animated.View entering={ZoomIn.duration(250)} style={styles.card} accessibilityViewIsModal>
            <View style={styles.icon}>
              <Ionicons name={icon} size={26} color={colors.primary} />
            </View>
            {kicker ? <Text style={styles.kicker}>{kicker}</Text> : null}
            <Text style={[styles.title, !kicker && styles.titleAlone]}>{title}</Text>
            <Text style={styles.body}>{body}</Text>
            {note ? <Text style={styles.note}>{note}</Text> : null}
            <Button title={action} icon={actionIcon} onPress={onAction} loading={busy} style={styles.button} />
            <Pressable onPress={onDismiss} hitSlop={8} style={styles.later} accessibilityRole="button">
              <Text style={styles.laterText}>{dismissLabel}</Text>
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
  titleAlone: { marginTop: spacing.md },
  body: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  note: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.accentText, textAlign: 'center', marginTop: spacing.sm },
  button: { alignSelf: 'stretch', marginTop: spacing.lg },
  later: { marginTop: spacing.md, paddingVertical: 4 },
  laterText: { fontSize: 15, fontWeight: '600', color: colors.muted },
});
