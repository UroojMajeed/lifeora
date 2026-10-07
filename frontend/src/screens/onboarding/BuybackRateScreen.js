import { useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import MoneyInput from '../../components/MoneyInput';
import RolePicker from '../../components/RolePicker';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { HeroCard } from '../../components/Card';
import { useOnboarding } from '../../context/OnboardingContext';
import { calculateBuybackRate, stepNumber } from '../../constants/content';
import { defaultCurrency } from '../../constants/currencies';
import { formatMoney, sanitizeAmount } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

/**
 * About you (onboarding step 1): what describes you and your yearly pay, which gives the Buyback Rate.
 * With `editing` (from Me) it only changes the pay; the role has its own screen there.
 */
export default function BuybackRateScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, saveEdit } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [role, setRole] = useState(onboarding?.role || null);
  // A brand-new account has the server default (USD); prefer the phone's region then.
  const [currency, setCurrency] = useState(() =>
    onboarding?.annualIncome != null ? onboarding.currency || 'USD' : defaultCurrency()
  );
  const [income, setIncome] = useState(onboarding?.annualIncome != null ? String(onboarding.annualIncome) : '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const amount = Number(income) || 0;
  const { effectiveHourlyRate, buybackRate } = calculateBuybackRate(amount);
  const ready = amount > 0 && (editing || Boolean(role));

  const pickRole = (key) => setRole(key);

  const next = async () => {
    if (!ready) return;
    setError('');
    setLoading(true);
    try {
      if (editing) {
        await saveEdit({ annualIncome: amount, currency });
        navigation.goBack();
        return;
      }
      const data = { role, annualIncome: amount, currency };
      // A different role means different suggestions, so the routine starts fresh.
      if (onboarding?.role && role !== onboarding.role) data.schedule = [];
      await saveStep(data, 'schedule');
      navigation.navigate('Schedule');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buttonTitle = editing ? 'Save' : !role ? 'Pick what describes you' : amount <= 0 ? 'Add your yearly pay' : 'Continue';

  return (
    // Scrolling means 'done typing': the keyboard closes so the whole screen is visible again.
    <Screen
      keyboardDismissMode="on-drag"
      footer={
        <Button
          title={buttonTitle}
          icon={ready ? (editing ? 'checkmark' : 'arrow-forward') : undefined}
          onPress={next}
          loading={loading}
          disabled={!ready}
        />
      }
    >
      <StepHeader
        step={stepNumber('buyback_rate')}
        editing={editing}
        eyebrow={editing ? 'Your Buyback Rate' : undefined}
        title={editing ? 'What does your business pay you a year?' : 'About you'}
        subtitle={editing ? 'A rough number is fine.' : undefined}
      />

      {!editing ? (
        <>
          <Text style={styles.label}>What describes you?</Text>
          <RolePicker value={role} onChange={pickRole} />

          <Text style={[styles.label, styles.gap]}>What does your business pay you a year?</Text>
          <Text style={styles.help}>A rough number is fine.</Text>
        </>
      ) : null}

      <MoneyInput
        currency={currency}
        onCurrencyChange={setCurrency}
        value={income}
        onChangeText={(t) => setIncome(sanitizeAmount(t))}
        placeholder="e.g. 120,000"
        accessibilityLabel="Yearly pay from your business"
      />

      <HeroCard style={styles.hero}>
        <Text style={styles.heroLabel}>Your Buyback Rate</Text>
        {/* Empty until there's a number, so nothing looks like a real value yet. */}
        <Text style={[styles.big, !amount && styles.bigEmpty]} adjustsFontSizeToFit numberOfLines={1}>
          {amount ? formatMoney(buybackRate, currency) : '—'}
          <Text style={styles.per}>/hr</Text>
        </Text>

        {amount ? (
          <>
            <View style={styles.divider} />
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Your time is worth</Text>
              <Text style={styles.rowValue}>{formatMoney(effectiveHourlyRate, currency)}/hr</Text>
            </View>
          </>
        ) : null}
      </HeroCard>

      <View style={styles.tip}>
        <Ionicons name="bulb-outline" size={18} color={colors.accentText} />
        <Text style={styles.tipText}>
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
  label: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  gap: { marginTop: spacing.lg, marginBottom: 2 },
  help: { fontSize: 13, color: colors.muted, marginBottom: spacing.sm },
  hero: { marginTop: spacing.lg },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  big: { color: colors.heroText, fontSize: 44, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  per: { fontSize: 20, fontWeight: '600', color: colors.heroMuted },
  divider: { height: 1, backgroundColor: colors.heroDivider, marginVertical: spacing.md },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: spacing.sm },
  rowLabel: { color: colors.heroMuted, fontSize: 15 },
  rowValue: { color: colors.heroText, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  bigEmpty: { color: colors.heroFaint },
  tip: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.accentSoft,
  },
  tipText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.text },
});
