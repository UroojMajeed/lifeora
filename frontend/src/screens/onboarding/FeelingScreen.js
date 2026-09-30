import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import OptionCard from '../../components/OptionCard';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { FEELINGS, stepNumber } from '../../constants/content';
import { colors, radius, spacing } from '../../theme';

export default function FeelingScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const [feeling, setFeeling] = useState(onboarding?.feeling || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const choice = FEELINGS.find((f) => f.key === feeling);

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      await saveStep({ feeling }, 'time_assassins');
      navigation.navigate('TimeAssassins');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="Continue" onPress={next} loading={loading} disabled={!feeling} />}>
      <StepHeader
        step={stepNumber('feeling')}
        eyebrow="The Replacement Ladder"
        title="How does your business feel right now?"
        subtitle="How you feel tells us which rung you're on, and who your next key hire should be."
      />

      <View style={styles.list} accessibilityRole="radiogroup">
        {FEELINGS.map((f) => (
          <OptionCard
            key={f.key}
            title={f.label}
            description={f.description}
            badge={`Rung ${f.rung}`}
            selected={feeling === f.key}
            onPress={() => setFeeling(f.key)}
          />
        ))}
      </View>

      {choice ? (
        <View style={styles.result}>
          <Text style={styles.resultLabel}>Your next move</Text>
          <Text style={styles.resultTitle}>Hire: {choice.nextHire}</Text>
          <Text style={styles.resultBody}>
            Hand them full ownership of {choice.ownership.toLowerCase()}. Until one person owns it, you still do.
          </Text>
        </View>
      ) : null}

      <ErrorBanner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
  result: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    borderLeftWidth: 4,
    borderLeftColor: colors.accent,
  },
  resultLabel: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  resultTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 4 },
  resultBody: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
});
