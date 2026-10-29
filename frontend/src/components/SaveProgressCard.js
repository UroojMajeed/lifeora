import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Button from './Button';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * The one real ask to save an account, shown to guests inside the "Done!" card after a handoff: the
 * proudest moment, and the most to lose. "Not now" hides it for good (the quiet links on Home and Me stay).
 */
export default function SaveProgressCard({ onSave, onDismiss }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="lock-closed" size={16} color={colors.primary} />
        <Text style={styles.title}>Keep your progress safe</Text>
      </View>
      <Text style={styles.body}>Right now it lives only on this phone. Save it to get it back on any phone.</Text>
      <Button title="Save my progress" icon="cloud-upload" size="small" onPress={onSave} style={styles.button} />
      <Pressable onPress={onDismiss} hitSlop={8} style={styles.later} accessibilityRole="button">
        <Text style={styles.laterText}>Not now</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (colors) => ({
  card: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 15, fontWeight: '800', color: colors.text },
  body: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  button: { marginTop: spacing.sm + 2 },
  later: { alignSelf: 'center', marginTop: spacing.sm, paddingVertical: 4 },
  laterText: { fontSize: 14, fontWeight: '600', color: colors.muted },
});
