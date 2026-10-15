import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Roadmap from '../../components/Roadmap';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import ThemeToggle from '../../components/ThemeToggle';
import { useOnboarding } from '../../context/OnboardingContext';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

/**
 * The first screen after the splash: the journey ahead as a road map, so people know why the next
 * questions matter. "Let's start" begins (no sign-up wall: it quietly creates a guest account the
 * first time); people with an account sign in from the link under it.
 */
export default function JourneyScreen({ navigation }) {
  const { user, startAsGuest } = useOnboarding();
  const { type, colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const start = async () => {
    setError('');
    // Already started (reopened before step 1 was done): just carry on.
    if (user) {
      navigation.navigate('BuybackRate');
      return;
    }
    setStarting(true);
    try {
      await startAsGuest();
      navigation.navigate('BuybackRate');
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  };

  const footer = (
    <View>
      <Button title="Let's start" icon="arrow-forward" onPress={start} loading={starting} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!user ? (
        <Pressable
          onPress={() => navigation.navigate('Account', { mode: 'signin' })}
          disabled={starting}
          accessibilityRole="button"
          hitSlop={8}
          style={({ pressed }) => [styles.signIn, pressed && { opacity: 0.7 }]}
        >
          <Text style={styles.signInText}>
            I already have an account. <Text style={styles.signInLink}>Sign in</Text>
          </Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    // No scrolling: the road map takes exactly the room between the heading and the button.
    <Screen tinted="dawn" scroll={false} footer={footer}>
      <View style={styles.top}>
        <ThemeToggle />
      </View>
      <Text style={[type.label, styles.eyebrow]}>Your journey</Text>
      <Text style={type.title}>How you buy back your time</Text>
      <View style={styles.note}>
        <Ionicons name="lock-closed-outline" size={13} color={colors.muted} />
        <Text style={styles.noteText}>Setup takes 2 minutes · Private to you</Text>
      </View>
      <Roadmap />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  top: { flexDirection: 'row', justifyContent: 'flex-end', paddingTop: spacing.sm, marginBottom: spacing.sm },
  eyebrow: { color: colors.primary, marginBottom: spacing.sm },
  note: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  noteText: { fontSize: 13, color: colors.muted },
  error: { color: colors.error, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  signIn: { alignItems: 'center', paddingTop: spacing.sm + 4 },
  signInText: { fontSize: 14, color: colors.muted },
  signInLink: { color: colors.primaryDark, fontWeight: '700' },
});
