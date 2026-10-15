import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import MoneyInput from '../../components/MoneyInput';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { HeroCard } from '../../components/Card';
import { useOnboarding } from '../../context/OnboardingContext';
import { WORK_HOURS_PER_YEAR, calculateBuybackRate, stepNumber } from '../../constants/content';
import { defaultCurrency } from '../../constants/currencies';
import { fitFontSize, formatMoney, groupDigits, sanitizeAmount } from '../../utils/format';
import { useStyles } from '../../theme/ThemeContext';
import { brand, radius, spacing } from '../../theme';

const MAX_COLUMN = 520; // tablets and big phones: a comfortable reading width, centred

/**
 * "What's your time worth?" (onboarding step 1): one answer, what your business pays you a year. Under
 * it, what the rate means (one line), then the card: your Buyback Rate big in the middle, your
 * hour's worth beside its label and the 2,000 work hours it comes from (always there, following
 * what you type). With `editing` (from Me)
 * it saves the new pay.
 */
export default function BuybackRateScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, saveEdit } = useOnboarding();
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
  const ready = amount > 0;

  // Big rates (e.g. PKR 1,250,000) shrink to fit the card instead of running off the screen.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const columnWidth = Math.min(screenWidth - 48, MAX_COLUMN);
  const gap = screenHeight < 740 ? spacing.md : spacing.lg - 4; // 16 on short phones, 20 otherwise
  const money = (n) => (amount ? formatMoney(n, currency) : '–');
  const rateText = money(buybackRate);
  // The big Buyback Rate fills the card's width at most; the two small numbers share it in halves.
  const bigFont = fitFontSize(`${rateText}/h`, columnWidth - 48, 48, 22);

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
      await saveStep({ annualIncome: amount, currency }, 'schedule');
      navigation.navigate('Schedule');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const buttonTitle = editing ? 'Save' : ready ? 'Map your routine' : 'Add your yearly pay';

  return (
    // Scrolling means 'done typing': the keyboard closes so the whole screen is visible again.
    <Screen
      keyboardDismissMode="on-drag"
      contentStyle={styles.column}
      footer={
        <Button
          title={buttonTitle}
          icon={ready ? (editing ? 'checkmark' : 'arrow-forward') : undefined}
          onPress={next}
          loading={loading}
          disabled={!ready}
          style={styles.button}
        />
      }
    >
      <StepHeader
        step={stepNumber('buyback_rate')}
        editing={editing}
        title={editing ? 'Your yearly pay' : "What's your time worth?"}
        subtitle={editing ? 'A rough number is fine.' : 'One number and we work it out.'}
      />

      <View style={{ marginTop: gap - spacing.lg }}>
        {!editing ? <Text style={styles.lead}>My business pays me each year…</Text> : null}
        <MoneyInput
          large
          currency={currency}
          onCurrencyChange={setCurrency}
          value={groupDigits(income)}
          onChangeText={(t) => setIncome(sanitizeAmount(t))}
          placeholder="120,000"
          accessibilityLabel="Yearly pay from your business"
        />
      </View>

      {/* What the rate means, said first, above the card. */}
      <View style={[styles.tip, { marginTop: gap }]}>
        <Ionicons name="bulb" size={18} color={brand.apricot} />
        <Text style={styles.tipText}>
          Anything someone else can do for{' '}
          <Text style={styles.tipRate}>{amount ? `${rateText}/hr` : 'your Buyback Rate'}</Text> or less shouldn't be yours.
        </Text>
      </View>

      {/* The answer, always here and following what you type ("–" until there's a number):
          the Buyback Rate big in the middle, how it's worked out small underneath. */}
      <HeroCard style={[styles.hero, { marginTop: spacing.md }]}>
        {/* Top: what it is, and what your hour is worth. */}
        <View style={styles.heroTop}>
          <Text style={styles.heroLabel}>Your Buyback Rate</Text>
          <View style={styles.worth}>
            <Text style={styles.worthText} numberOfLines={1}>
              Your hour is worth {amount ? formatMoney(effectiveHourlyRate, currency, { decimals: 0 }) : '–'}
            </Text>
          </View>
        </View>
        {/* The rate itself, big in the middle. */}
        <Text style={[styles.big, { fontSize: bigFont, lineHeight: Math.round(bigFont * 1.2) }]} numberOfLines={1}>
          {rateText}
          {amount ? <Text style={[styles.per, { fontSize: Math.max(14, Math.round(bigFont * 0.42)) }]}>/hr</Text> : null}
        </Text>
        {/* Where it comes from, quietly. */}
        <Text style={styles.basis}>From {WORK_HOURS_PER_YEAR.toLocaleString('en-US')} work hours a year</Text>
      </HeroCard>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  column: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  button: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  lead: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm + 2, letterSpacing: -0.2 },
  hero: { padding: spacing.md + 4 },
  tip: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 16, lineHeight: 23, fontWeight: '700', color: colors.text },
  tipRate: { color: colors.accentText, fontWeight: '800' },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  heroLabel: { color: brand.apricot, fontSize: 12, fontWeight: '800', letterSpacing: 1, textTransform: 'uppercase' },
  worth: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.heroChip },
  worthText: { color: colors.heroText, fontSize: 12, fontWeight: '700' },
  big: { color: colors.heroText, fontWeight: '800', letterSpacing: -1, textAlign: 'center', marginTop: spacing.md },
  per: { fontWeight: '600', color: colors.heroMuted, letterSpacing: 0 },
  basis: { color: colors.heroMuted, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: spacing.sm },
});
