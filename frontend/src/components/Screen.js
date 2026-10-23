import { useEffect, useState } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** True while the on-screen keyboard is showing. */
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

/** Standard screen: scrollable content (optionally pull-to-refresh) with a pinned footer (for the CTA), hidden while typing. */
export default function Screen({ children, footer, scroll = true, scrollEnabled = true, edges = ['top', 'bottom'], contentStyle, refreshControl, keyboardDismissMode, avoidKeyboard = false, keepFooter = false, tinted = false, scrollRef }) {
  const { isDark, colors } = useTheme();
  const styles = useStyles(makeStyles);
  const keyboardOpen = useKeyboardOpen();
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { ref: scrollRef, contentContainerStyle: [styles.content, contentStyle], keyboardShouldPersistTaps: 'handled', scrollEnabled, refreshControl, keyboardDismissMode }
    : { style: [styles.content, styles.fill, contentStyle] };

  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      {/* tinted: the day as a soft wash, morning at the top to evening at the bottom.
          tinted="dawn": a sunrise, cool at the top warming to gold at the bottom (the journey). */}
      {tinted ? (
        <LinearGradient
          colors={tinted === 'dawn' ? colors.dawnGradient : colors.dayGradient}
          locations={[0, 0.3, 0.65, 1]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
      ) : null}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {/* iOS always lifts content above the keyboard. Android (edge-to-edge) doesn't shrink the window, so
          screens with a bar pinned to the bottom (avoidKeyboard) are lifted there too. */}
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' || avoidKeyboard ? 'padding' : undefined}
      >
        <Body {...bodyProps}>{children}</Body>
        {/* The footer hides while typing, unless keepFooter: then it rides above the keyboard. On Android
            (where the keyboard covers the screen without resizing it) it keeps its space while hidden, so
            nothing on the page jumps when the keyboard closes. */}
        {footer && (!keyboardOpen || keepFooter) ? (
          <View style={styles.footer}>{footer}</View>
        ) : footer && Platform.OS === 'android' && !avoidKeyboard ? (
          <View style={[styles.footer, styles.footerHidden]} pointerEvents="none" importantForAccessibility="no-hide-descendants">
            {footer}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = (colors) => ({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    gap: spacing.sm,
  },
  footerHidden: { opacity: 0 },
});
