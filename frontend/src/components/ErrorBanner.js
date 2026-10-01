import { Text, View } from 'react-native';
import { useStyles } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

export default function ErrorBanner({ message }) {
  const styles = useStyles(makeStyles);
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const makeStyles = (colors) => ({
  box: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  text: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
