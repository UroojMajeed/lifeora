import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

export default function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <View style={styles.box} accessibilityRole="alert">
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: '#FDECEC',
    borderRadius: radius.sm,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  text: { color: colors.error, fontSize: 14, lineHeight: 20 },
});
