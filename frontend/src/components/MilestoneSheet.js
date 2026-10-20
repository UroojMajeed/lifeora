import { Modal, Pressable, Share, Text, View } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import Logo from './Logo';
import Wordmark from './Wordmark';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

/**
 * A milestone, celebrated once: a sheet over Home with what you reached, what it means, and the card
 * people can share (shared as text for now; as an image once the app has the native add-ons).
 * `milestone` is from constants/milestones; `line` says what it means.
 */
export default function MilestoneSheet({ milestone, line, onClose }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  if (!milestone) return null;

  const share = () => {
    Share.share({ message: milestone.share }).catch(() => {});
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <Animated.View entering={SlideInDown.duration(350)} style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.grab} />
        <Animated.Text entering={FadeIn.delay(200).duration(400)} style={styles.emoji}>
          🎉
        </Animated.Text>
        <Text style={styles.title}>{milestone.title}</Text>
        <Text style={styles.line}>{line}</Text>

        {/* The card to share: what friends would see. */}
        <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.shareCard}>
          <View pointerEvents="none" style={styles.glow} />
          <View style={styles.brandRow}>
            <Logo size={22} />
            <Wordmark height={14} color={brand.white} />
          </View>
          <Text style={styles.cardSmall}>I bought back</Text>
          <Text style={styles.cardBig}>{milestone.badge}</Text>
          <Text style={styles.cardSmall}>{milestone.key.startsWith('round-') ? 'of the Buyback Loop, done' : 'of my time'}</Text>
        </LinearGradient>

        <Button title="Share" icon="share-social" onPress={share} style={styles.button} />
        <Pressable onPress={onClose} hitSlop={8} accessibilityRole="button" style={styles.later}>
          <Text style={styles.laterText}>Not now</Text>
        </Pressable>
        <View style={styles.saved}>
          <Ionicons name="ribbon-outline" size={13} color={colors.muted} />
          <Text style={styles.savedText}>Saved to your milestones on Me</Text>
        </View>
      </Animated.View>
    </Modal>
  );
}

const makeStyles = (colors) => ({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,23,22,0.45)' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  grab: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  emoji: { fontSize: 44 },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center', marginTop: spacing.sm },
  line: { fontSize: 15, lineHeight: 21, color: colors.muted, textAlign: 'center', marginTop: 4, maxWidth: 300 },
  shareCard: { alignSelf: 'stretch', marginTop: spacing.lg, padding: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  glow: { position: 'absolute', width: 140, height: 140, right: -60, top: -70, borderRadius: 70, backgroundColor: brand.apricot, opacity: 0.18 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.md },
  cardSmall: { fontSize: 14, fontWeight: '600', color: colors.heroMuted },
  cardBig: { fontSize: 28, fontWeight: '800', color: brand.apricot, letterSpacing: -0.5, marginVertical: 2 },
  button: { alignSelf: 'stretch', marginTop: spacing.lg },
  later: { marginTop: spacing.md },
  laterText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  saved: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.md },
  savedText: { fontSize: 12, color: colors.muted },
});
