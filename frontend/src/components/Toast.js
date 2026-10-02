import { useEffect, useRef } from 'react';
import { Animated, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/** A short message that slides in at the bottom, then hides itself. Change `message` to show it again. */
export default function Toast({ message, icon = 'sparkles', onHide, duration = 2600 }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!message) return undefined;
    Animated.spring(anim, { toValue: 1, damping: 16, stiffness: 200, useNativeDriver: true }).start();
    const t = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 220, useNativeDriver: true }).start(() => onHide?.());
    }, duration);
    return () => clearTimeout(t);
  }, [message, anim, duration, onHide]);

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { bottom: insets.bottom + spacing.lg },
        { opacity: anim, transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] },
      ]}
    >
      <Ionicons name={icon} size={18} color={colors.accent} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const makeStyles = (colors) => ({
  toast: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    borderRadius: radius.md,
    backgroundColor: colors.heroFrom,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  text: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.heroText },
});
