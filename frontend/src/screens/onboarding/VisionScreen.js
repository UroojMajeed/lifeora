import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import TextField from '../../components/TextField';
import Chip from '../../components/Chip';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { stepNumber } from '../../constants/content';
import { colors, spacing } from '../../theme';

const STARTERS = [
  'Dinner with my family every night',
  'Train for a marathon',
  'Build our next product',
  'Close bigger deals',
  'Learn something new',
];

const MAX = 1000;

export default function VisionScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const [vision, setVision] = useState(onboarding?.visionStatement || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addStarter = (s) =>
    setVision((v) => {
      const base = v.trim();
      return (base ? `${base}${/[.!?]$/.test(base) ? '' : '.'} ${s}.` : `${s}.`).slice(0, MAX);
    });

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      await saveStep({ visionStatement: vision.trim() }, 'summary');
      navigation.navigate('Summary');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="See my plan" onPress={next} loading={loading} disabled={!vision.trim()} />}>
      <StepHeader
        step={stepNumber('vision')}
        eyebrow="Fill"
        title="If you bought back 10 hours a week, what would you do with them?"
        subtitle="This is the picture you're working toward. Write it like it's already true."
      />

      <TextField
        value={vision}
        onChangeText={(t) => setVision(t.slice(0, MAX))}
        placeholder="With 10 extra hours a week, I'd…"
        multiline
        maxLength={MAX}
      />
      <Text style={styles.counter}>
        {vision.length}/{MAX}
      </Text>

      <Text style={styles.label}>Need a spark? Tap to add</Text>
      <View style={styles.chips}>
        {STARTERS.map((s) => (
          <Chip key={s} label={s} selected={false} onPress={() => addStarter(s)} />
        ))}
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  counter: { alignSelf: 'flex-end', fontSize: 12, color: colors.muted, marginTop: 4 },
  label: { marginTop: spacing.md, marginBottom: spacing.sm, fontSize: 14, fontWeight: '600', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
