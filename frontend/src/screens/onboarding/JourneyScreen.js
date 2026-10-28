import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import JourneyTiles from '../../components/JourneyTiles';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
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
  const { colors } = useTheme();
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
    // The four steps as tiles, then where they lead. Scrolls on short phones.
    <Screen footer={footer}>
      <Text style={styles.hero} accessibilityRole="header">
        Buy back{'\n'}your time
      </Text>
      <View style={styles.note}>
        <Ionicons name="lock-closed-outline" size={14} color={colors.muted} />
        <Text style={styles.noteText}>Setup takes 2 minutes · Private to you</Text>
      </View>
      <JourneyTiles />
      <View style={styles.end}>
        <Ionicons name="sunny" size={40} color={colors.accent} />
        <Text style={styles.endTitle}>Your time back</Text>
        <Text style={styles.endSub}>for the work and life you love</Text>
      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  hero: { fontSize: 44, lineHeight: 48, fontWeight: '800', letterSpacing: -1.2, color: colors.primaryDark, marginTop: spacing.lg },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm },
  noteText: { fontSize: 14, color: colors.muted },
  end: { alignItems: 'center', marginTop: spacing.lg, marginBottom: spacing.sm },
  endTitle: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5, color: colors.primaryDark, marginTop: spacing.xs },
  endSub: { fontSize: 16, fontWeight: '700', color: colors.accentText, marginTop: 2 },
  error: { color: colors.error, fontSize: 14, lineHeight: 20, textAlign: 'center', marginTop: spacing.sm },
  signIn: { alignItems: 'center', paddingTop: spacing.sm + 4 },
  signInText: { fontSize: 14, color: colors.muted },
  signInLink: { color: colors.primaryDark, fontWeight: '700' },
});
