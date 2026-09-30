import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import OptionCard from '../../components/OptionCard';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { TIME_ASSASSINS, stepNumber } from '../../constants/content';
import { spacing } from '../../theme';

export default function TimeAssassinsScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const [selected, setSelected] = useState(onboarding?.timeAssassins || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key) => setSelected((s) => (s.includes(key) ? s.filter((k) => k !== key) : [...s, key]));

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      await saveStep({ timeAssassins: selected }, 'vision');
      navigation.navigate('Vision');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          title={selected.length ? 'Continue' : "None of these fit me"}
          variant={selected.length ? 'primary' : 'secondary'}
          onPress={next}
          loading={loading}
        />
      }
    >
      <StepHeader
        step={stepNumber('time_assassins')}
        eyebrow="The 5 Time Assassins"
        title="Which of these sound like you?"
        subtitle="Most founders are comfortable in chaos, and it leaks out in these habits. Be honest. Pick all that apply."
      />

      <View style={styles.list}>
        {TIME_ASSASSINS.map((a) => (
          <OptionCard
            key={a.key}
            multi
            title={a.label}
            description={a.description}
            selected={selected.includes(a.key)}
            onPress={() => toggle(a.key)}
          />
        ))}
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: spacing.sm },
});
