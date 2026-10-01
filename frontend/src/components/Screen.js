import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** Standard onboarding screen: scrollable content with a pinned footer (for the CTA). */
export default function Screen({ children, footer, scroll = true, scrollEnabled = true, contentStyle }) {
  const { isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { contentContainerStyle: [styles.content, contentStyle], keyboardShouldPersistTaps: 'handled', scrollEnabled }
    : { style: [styles.content, styles.fill, contentStyle] };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Body {...bodyProps}>{children}</Body>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
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
});
