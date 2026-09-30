import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { FEELINGS, TIME_ASSASSINS, stepNumber } from '../../constants/content';
import { formatMoney } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';

function Card({ label, children, accent }) {
  return (
    <View style={[styles.card, accent && styles.cardAccent]}>
      <Text style={[styles.cardLabel, accent && { color: colors.primary }]}>{label}</Text>
      {children}
    </View>
  );
}

export default function SummaryScreen({ navigation }) {
  const { user, onboarding, complete } = useOnboarding();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const o = onboarding || {};
  const ladder = FEELINGS.find((f) => f.key === o.feeling);
  const assassins = TIME_ASSASSINS.filter((a) => o.timeAssassins?.includes(a.key));

  const finish = async () => {
    setError('');
    setLoading(true);
    try {
      await complete();
      navigation.reset({ index: 0, routes: [{ name: 'Home' }] });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="Start buying back my time" onPress={finish} loading={loading} />}>
      <StepHeader
        step={stepNumber('summary')}
        eyebrow="Your Buyback Plan"
        title={`Here's where you stand${user?.name ? `, ${user.name}` : ''}.`}
      />

      <View style={styles.stack}>
        <Card label="Your Buyback Rate" accent>
          <Text style={styles.big}>{formatMoney(o.buybackRate)}/hr</Text>
          <Text style={styles.onDark}>Your time is worth {formatMoney(o.effectiveHourlyRate)}/hr.</Text>
        </Card>

        {ladder ? (
          <Card label={`Replacement Ladder · Rung ${ladder.rung}: ${ladder.rungName}`}>
            <Text style={styles.title}>Next key hire: {ladder.nextHire}</Text>
            <Text style={styles.body}>Owns {ladder.ownership.toLowerCase()}.</Text>
          </Card>
        ) : null}

        {o.drainingTasks?.length ? (
          <Card label="First tasks to transfer">
            <Text style={styles.body}>{o.drainingTasks.join(' · ')}</Text>
          </Card>
        ) : null}

        <Card label="Time Assassins to watch">
          <Text style={styles.body}>
            {assassins.length ? assassins.map((a) => a.label).join(', ') : 'None selected. Keep an eye out anyway.'}
          </Text>
        </Card>

        {o.visionStatement ? (
          <Card label="What you'll fill your time with">
            <Text style={styles.quote}>“{o.visionStatement}”</Text>
          </Card>
        ) : null}
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.sm },
  card: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  cardAccent: { backgroundColor: colors.navy, borderColor: colors.navy },
  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6 },
  big: { fontSize: 34, fontWeight: '800', color: colors.white },
  onDark: { fontSize: 14, color: '#C9D6E3' },
  title: { fontSize: 17, fontWeight: '800', color: colors.text },
  body: { fontSize: 15, lineHeight: 22, color: colors.text },
  quote: { fontSize: 15, lineHeight: 22, color: colors.text, fontStyle: 'italic' },
});
