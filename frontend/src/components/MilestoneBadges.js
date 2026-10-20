import { Pressable, Share, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/**
 * Your milestones on Me: the ones reached in colour (tap one to share it again) and the next one
 * greyed out, so there's always something ahead.
 */
export default function MilestoneBadges({ earned = [], next }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  if (!earned.length && !next) return null;
  return (
    <View style={styles.row}>
      {earned.map((m) => (
        <Pressable
          key={m.key}
          onPress={() => Share.share({ message: m.share }).catch(() => {})}
          accessibilityRole="button"
          accessibilityLabel={`${m.title}. Tap to share.`}
          style={({ pressed }) => [styles.badge, pressed && { opacity: 0.8 }]}
        >
          <View style={styles.medal}>
            <Ionicons name={m.icon} size={18} color={colors.heroFrom} />
          </View>
          <Text style={styles.text} numberOfLines={1}>
            {m.badge}
          </Text>
        </Pressable>
      ))}
      {next ? (
        <View style={styles.badge} accessible accessibilityLabel={`Next milestone: ${next.title}`}>
          <View style={[styles.medal, styles.medalNext]}>
            <Ionicons name="lock-closed" size={15} color={colors.muted} />
          </View>
          <Text style={[styles.text, styles.textNext]} numberOfLines={1}>
            Next: {next.badge}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, paddingVertical: spacing.sm },
  badge: { width: 72, alignItems: 'center', gap: 6 },
  medal: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  medalNext: { backgroundColor: colors.surfaceAlt, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border },
  text: { fontSize: 12, fontWeight: '800', color: colors.text },
  textNext: { fontWeight: '600', color: colors.muted },
});
