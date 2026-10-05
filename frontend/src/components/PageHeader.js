import { Pressable, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ThemeToggle from './ThemeToggle';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** Header for in-app screens (after onboarding): back (not on tabs), theme toggle, then an eyebrow + title. */
export default function PageHeader({ eyebrow, title, subtitle }) {
  const navigation = useNavigation();
  const { colors, type } = useTheme();
  const styles = useStyles(makeStyles);
  // Tab pages are top-level: no back button there (the tab bar is the way around).
  const showBack = navigation.getState()?.type !== 'tab' && navigation.canGoBack();

  return (
    <View style={styles.wrap}>
      <View style={styles.topRow}>
        {showBack ? (
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>
        ) : (
          <View />
        )}
        <ThemeToggle />
      </View>
      {eyebrow ? <Text style={[type.label, styles.eyebrow]}>{eyebrow}</Text> : null}
      <Text style={type.title}>{title}</Text>
      {subtitle ? <Text style={[type.subtitle, styles.subtitle]}>{subtitle}</Text> : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { paddingTop: spacing.sm, marginBottom: spacing.lg },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.lg },
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
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  subtitle: { marginTop: spacing.sm },
});
