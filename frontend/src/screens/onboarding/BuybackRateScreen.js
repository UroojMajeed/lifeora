import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { calculateBuybackRate, stepNumber } from '../../constants/content';
import { formatMoney, sanitizeAmount } from '../../utils/format';
import { colors, radius, spacing } from '../../theme';

export default function BuybackRateScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const [income, setIncome] = useState(onboarding?.annualIncome != null ? String(onboarding.annualIncome) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amount = Number(income) || 0;
  const { effectiveHourlyRate, buybackRate } = calculateBuybackRate(amount);

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      await saveStep({ annualIncome: amount }, 'energy_drains');
      navigation.navigate('EnergyDrains');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="Continue" onPress={next} loading={loading} disabled={amount <= 0} />}>
      <StepHeader
        step={stepNumber('buyback_rate')}
        eyebrow="Your Buyback Rate"
        title="What does your business pay you each year?"
        subtitle="Include salary, profit, and perks the business covers. A rough number is fine."
      />

      <TextField
        label="Annual pay from your business"
        prefix="$"
        value={income}
        onChangeText={(t) => setIncome(sanitizeAmount(t))}
        placeholder="200000"
        keyboardType="decimal-pad"
        returnKeyType="done"
      />

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Your time is worth</Text>
          <Text style={styles.rowValue}>{formatMoney(effectiveHourlyRate)}/hr</Text>
        </View>
        <Text style={styles.formula}>Annual pay ÷ 2,000 work hours</Text>

        <View style={styles.divider} />

        <Text style={styles.bigLabel}>Your Buyback Rate</Text>
        <Text style={styles.big}>{formatMoney(buybackRate)}/hr</Text>
        <Text style={styles.formula}>Hourly value ÷ 4, so every hire pays you back 4x</Text>
      </View>

      <Text style={styles.rule}>
        {amount > 0
          ? `From now on: if a task you don't enjoy can be done by someone else for ${formatMoney(buybackRate)}/hr or less, it shouldn't be yours.`
          : 'Enter a number to see how much you can afford to pay someone to take tasks off your plate.'}
      </Text>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.navy,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  rowLabel: { color: '#C9D6E3', fontSize: 15 },
  rowValue: { color: colors.white, fontSize: 18, fontWeight: '700' },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.15)', marginVertical: spacing.md },
  bigLabel: { color: colors.primary, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  big: { color: colors.white, fontSize: 40, fontWeight: '800', marginTop: 2 },
  formula: { color: '#8FA3B8', fontSize: 13, marginTop: 4 },
  rule: { marginTop: spacing.md, fontSize: 15, lineHeight: 22, color: colors.text },
});
