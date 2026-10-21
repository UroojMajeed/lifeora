import { useEffect, useState } from 'react';
import { Keyboard, Modal, Platform, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useStyles } from '../theme/ThemeContext';
import { spacing } from '../theme';

const IN = { duration: 300, easing: Easing.out(Easing.cubic) };
const OUT = { duration: 220, easing: Easing.in(Easing.cubic) };

/**
 * A bottom sheet: the page behind fades to a soft evergreen tint, the sheet slides up whole (from
 * below the screen, so it never shows half-open), and slides away when closed. Tapping outside
 * closes it. Typing: Android's own resize lifts the sheet; on iOS it moves up by the keyboard.
 */
export default function BottomSheet({ visible, onClose, children }) {
  const styles = useStyles(makeStyles);
  const { height } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [keyboard, setKeyboard] = useState(0);
  const shade = useSharedValue(0);
  const lift = useSharedValue(height);

  // Open: mount, then fade and slide in. Close: slide and fade out, then unmount.
  useEffect(() => {
    if (visible) {
      setMounted(true);
      shade.value = withTiming(1, IN);
      lift.value = withTiming(0, IN);
    } else if (mounted) {
      shade.value = withTiming(0, OUT);
      lift.value = withTiming(height, OUT);
      const t = setTimeout(() => setMounted(false), OUT.duration);
      return () => clearTimeout(t);
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // iOS doesn't resize for the keyboard inside a modal, so lift the sheet by its height.
  useEffect(() => {
    if (Platform.OS !== 'ios' || !mounted) return undefined;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setKeyboard(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setKeyboard(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [mounted]);

  const backdrop = useAnimatedStyle(() => ({ opacity: shade.value }));
  const sheet = useAnimatedStyle(() => ({ transform: [{ translateY: lift.value }] }));

  if (!mounted) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdrop]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        </Animated.View>
        <Animated.View style={[styles.sheet, { marginBottom: keyboard }, sheet]} accessibilityViewIsModal>
          <View style={styles.grab} />
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors, isDark) => ({
  root: { flex: 1, justifyContent: 'flex-end' },
  // A soft evergreen tint, not flat grey.
  backdrop: { backgroundColor: isDark ? 'rgba(2,10,9,0.6)' : 'rgba(18,60,58,0.32)' },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
    shadowColor: '#0A1716',
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -6 },
    elevation: 24,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
});
