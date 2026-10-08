import { Text, View, useWindowDimensions } from 'react-native';
import Roadmap from '../../components/Roadmap';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import ThemeToggle from '../../components/ThemeToggle';
import { resetTo } from '../../constants/content';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

/**
 * Shown once, right after "Get started": the journey ahead as a road map (know your worth → see
 * what drains you → hand it off → your time back), so people know why the next questions matter.
 */
export default function JourneyScreen({ navigation }) {
  const { type } = useTheme();
  const styles = useStyles(makeStyles);
  const { height: screenHeight } = useWindowDimensions();
  // The road takes the room between the heading and the button.
  const roadHeight = Math.max(260, Math.min(420, screenHeight - 360));

  return (
    <Screen
      tinted
      footer={<Button title="Let's start" icon="arrow-forward" onPress={() => navigation.reset(resetTo('BuybackRate'))} />}
    >
      <View style={styles.top}>
        <ThemeToggle />
      </View>
      <Text style={[type.label, styles.eyebrow]}>Your journey</Text>
      <Text style={type.title}>Three steps to your time back</Text>
      <Roadmap height={roadHeight} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.sm, marginBottom: spacing.md },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
});
