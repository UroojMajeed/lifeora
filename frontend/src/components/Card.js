import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

/** Plain surface card with a soft shadow in light mode and a hairline border in dark mode. */
export function Card({ children, style }) {
  const { colors, isDark } = useTheme();
  return (
    <View
      style={[
        {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md + 4,
          borderWidth: 1,
          borderColor: isDark ? colors.border : 'transparent',
        },
        cardShadow(colors, isDark),
        style,
      ]}
    >
      {children}
    </View>
  );
}

/** Indigo → sky gradient card for the big numbers (Buyback Rate, insights). */
export function HeroCard({ children, style }) {
  const { colors } = useTheme();
  return (
    <LinearGradient
      colors={[colors.heroFrom, colors.heroTo]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[{ borderRadius: radius.lg, padding: spacing.lg }, style]}
    >
      {children}
    </LinearGradient>
  );
}
