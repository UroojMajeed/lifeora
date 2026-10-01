import { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import MoneyInput from '../../components/MoneyInput';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { HeroCard } from '../../components/Card';
import { useOnboarding } from '../../context/OnboardingContext';
import { calculateBuybackRate, stepNumber } from '../../constants/content';
import { defaultCurrency } from '../../constants/currencies';
import { formatMoney, sanitizeAmount } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

export default function BuybackRateScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  // A brand-new account has the server default (USD); prefer the phone's region then.
  const [currency, setCurrency] = useState(() =>
    onboarding?.annualIncome != null ? onboarding.currency || 'USD' : defaultCurrency()
  );
  const [income, setIncome] = useState(onboarding?.annualIncome != null ? String(onboarding.annualIncome) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amount = Number(income) || 0;
  const { effectiveHourlyRate, buybackRate } = calculateBuybackRate(amount);

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      await saveStep({ annualIncome: amount, currency }, 'schedule');
      navigation.navigate('Schedule');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="Continue" icon="arrow-forward" onPress={next} loading={loading} disabled={amount <= 0} />}>
      <StepHeader
        step={stepNumber('buyback_rate')}
        eyebrow="Your Buyback Rate"
        title="What does your business pay you a year?"
        subtitle="Salary, profit and perks together. A rough number is fine."
      />

      <MoneyInput
        label="Yearly pay from your business"
        currency={currency}
        onCurrencyChange={setCurrency}
        value={income}
        onChangeText={(t) => setIncome(sanitizeAmount(t))}
        placeholder="200000"
      />

      <HeroCard style={styles.hero}>
        <Text style={styles.heroLabel}>Your Buyback Rate</Text>
        <Text style={styles.big} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(buybackRate, currency)}
          <Text style={styles.per}>/hr</Text>
        </Text>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.rowLabel}>Your time is worth</Text>
          <Text style={styles.rowValue}>{formatMoney(effectiveHourlyRate, currency)}/hr</Text>
        </View>
        <Text style={styles.formula}>Yearly pay ÷ 2,000 hours, then ÷ 4 so every hire pays you back 4×</Text>
      </HeroCard>

      <View style={styles.rule}>
        <Ionicons name="bulb-outline" size={18} color={colors.accent} />
        <Text style={styles.ruleText}>
          {amount > 0
            ? `If a task you don't enjoy can be done by someone else for ${formatMoney(buybackRate, currency)}/hr or less, it shouldn't be yours.`
            : 'Enter a number to see how much you can afford to pay someone to take tasks off your plate.'}
        </Text>
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  hero: { marginTop: spacing.lg },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  big: { color: colors.heroText, fontSize: 44, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  per: { fontSize: 20, fontWeight: '600', color: colors.heroMuted },
  divider: { height: 1, backgroundColor: colors.heroDivider, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  rowLabel: { color: colors.heroMuted, fontSize: 15 },
  rowValue: { color: colors.heroText, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  formula: { color: colors.heroFaint, fontSize: 12, lineHeight: 17, marginTop: spacing.sm },
  rule: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
  },
  ruleText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
});
