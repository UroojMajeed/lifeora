import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Roadmap from '../../components/Roadmap';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import ThemeToggle from '../../components/ThemeToggle';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

/**
 * Shown once, right after "Get started": the journey ahead as a road map. Each step says what you
 * share and what you get back (and how long it takes), so people know why the next questions matter.
 */
export default function JourneyScreen({ navigation }) {
  const { type, colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { height: screenHeight } = useWindowDimensions();
  // The road takes the room between the heading and the button.
  const roadHeight = Math.max(330, Math.min(480, screenHeight - 330));

  return (
    <Screen
      tinted
      footer={<Button title="Let's start" icon="arrow-forward" onPress={() => navigation.navigate('BuybackRate')} />}
    >
      <View style={styles.top}>
        <ThemeToggle />
      </View>
      <Text style={[type.label, styles.eyebrow]}>Your journey</Text>
      <Text style={type.title}>How you buy back your time</Text>
      <View style={styles.note}>
        <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
        <Text style={styles.noteText}>Setup takes 2 minutes · Private to you</Text>
      </View>
      <Roadmap height={roadHeight} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.sm, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  noteText: { fontSize: 13, color: colors.muted },
});
