import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** The routine list before anything is added: calm and simple, pointing to the suggestions below. */
export default function EmptyRoutine() {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.wrap}>
      <View style={styles.icon}>
        <Ionicons name="sunny-outline" size={28} color={colors.primaryDark} />
      </View>
      <Text style={styles.title}>Start with your morning</Text>
      <Text style={styles.text}>Pick a suggestion below or type your own.{'\n'}Most people add 5–8 tasks.</Text>
    </View>
  );
}

const makeStyles = (colors) => ({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  icon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  text: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: spacing.xs },
});
