import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand } from '../theme';

/** Round ☀️/🌙 button that switches between light and dark. `onHero` styles it for gradient backgrounds. */
export default function ThemeToggle({ onHero = false }) {
  const { isDark, toggle, colors } = useTheme();
  const styles = useStyles(makeStyles);

  const press = () => {
    Haptics.selectionAsync().catch(() => {});
    toggle();
  };

  return (
    <Pressable
      onPress={press}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={({ pressed }) => [styles.button, onHero && styles.onHero, pressed && { opacity: 0.7 }]}
    >
      <Ionicons
        name={isDark ? 'sunny' : 'moon'}
        size={18}
        color={onHero ? colors.heroText : isDark ? brand.apricot : colors.text}
      />
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  onHero: { backgroundColor: colors.heroChip, borderColor: 'transparent' },
});
