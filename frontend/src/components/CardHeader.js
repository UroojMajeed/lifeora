import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

/** The one card shell for Home: same padding, corners, border and shadow (the tint comes per card). */
export const homeCard = (colors, isDark) => ({
  padding: spacing.md,
  borderRadius: radius.lg,
  borderWidth: 1,
  borderColor: isDark ? colors.border : 'transparent',
  ...cardShadow(colors, isDark),
});

/**
 * The one header for Home's cards: an icon tile, a title and an optional line under it, and an
 * optional thing on the right (a chip, a spinner). Same sizes on every card.
 */
export default function CardHeader({ icon, iconColor, title, sub, right }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.head}>
      <View style={styles.icon}>
        <Ionicons name={icon} size={17} color={iconColor} />
      </View>
      <View style={styles.main}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {sub ? <Text style={styles.sub}>{sub}</Text> : null}
      </View>
      {right || null}
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  main: { flex: 1, minWidth: 0 },
  title: { fontSize: 18, fontWeight: '800', color: colors.text }, // the card title: the biggest text in a card
  sub: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 1 },
});
