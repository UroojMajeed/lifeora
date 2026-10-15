import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import MoneyInput from '../../components/MoneyInput';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { WORK_HOURS_PER_YEAR, calculateBuybackRate, stepNumber } from '../../constants/content';
import { defaultCurrency } from '../../constants/currencies';
import { fitFontSize, formatMoney, groupDigits, sanitizeAmount } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { brand, radius, spacing } from '../../theme';

const MAX_COLUMN = 520; // tablets and big phones: a comfortable reading width, centred

/**
 * Journey step 1, "Know your worth": the question (your yearly pay, private to you), then the answer
 * in one card, read top to bottom: your Buyback Rate big in the middle, your hour's worth in an
 * apricot chip and the 2,000 work hours it's based on (following what you type). Last, on its own
 * in a warm highlighted box, what it means for you. With `editing` (from Me) it saves the new pay.
 */
export default function BuybackRateScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, saveEdit } = useOnboarding();
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
  const ready = amount > 0;

  // Big rates (e.g. PKR 1,250,000) shrink to fit the card instead of running off the screen.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const columnWidth = Math.min(screenWidth - 48, MAX_COLUMN);
  const gap = screenHeight < 740 ? spacing.md : spacing.lg - 4; // 16 on short phones, 20 otherwise
  const money = (n) => (amount ? formatMoney(n, currency) : '–');
  const rateText = money(buybackRate);
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
      {/* The journey's own words: this is step 1 of 4, "Know your worth". */}
      <StepHeader
        step={stepNumber('buyback_rate')}
        editing={editing}
        eyebrow={editing ? null : 'Step 1 of 4'}
        title={editing ? 'Your yearly pay' : 'Know your worth'}
        subtitle={editing ? 'A rough number is fine.' : null}
      />

      {/* 1) The question */}
      <View style={{ marginTop: gap - spacing.lg }}>
        {!editing ? (
          <View style={styles.leadRow}>
            <Text style={styles.lead}>Your yearly pay</Text>
            <View style={styles.private}>
              <Ionicons name="lock-closed" size={12} color={colors.muted} />
              <Text style={styles.privateText}>Private to you</Text>
            </View>
          </View>
        ) : null}
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

      {/* 2) The answer, one card: the rate, your hour's worth and what it's based on. Always here at
          full strength, following what you type ("–" until there's a number). */}
      <View style={{ marginTop: gap }}>
        <View style={styles.hero}>
          <View style={styles.heroBody}>
            <Text style={styles.title}>Your Buyback Rate</Text>
            <Text style={[styles.big, { fontSize: bigFont, lineHeight: Math.round(bigFont * 1.2) }]} numberOfLines={1}>
              {rateText}
              {amount ? <Text style={[styles.per, { fontSize: Math.max(14, Math.round(bigFont * 0.42)) }]}>/hr</Text> : null}
            </Text>
            {/* Your hour's worth, highlighted in an apricot chip. */}
            <View style={styles.worthChip}>
              <Ionicons name="time" size={14} color={colors.accentText} />
              <Text style={styles.worthText}>
                Your hour is worth <Text style={styles.worthValue}>{amount ? `${money(effectiveHourlyRate)}/hr` : '–'}</Text>
              </Text>
            </View>
          </View>
          {/* The work year it's based on, stuck to the bottom of the card. */}
          <View style={styles.basis}>
            <Ionicons name="calendar-outline" size={14} color={colors.muted} />
            <Text style={styles.basisText}>Based on {WORK_HOURS_PER_YEAR.toLocaleString('en-US')} work hours a year</Text>
          </View>
        </View>
      </View>

      {/* 3) What it means for you, last and on its own: a warm, highlighted box. */}
      <View style={styles.tip}>
        <View style={styles.tipIcon}>
          <Ionicons name="bulb" size={18} color={colors.onColor} />
        </View>
        <Text style={styles.tipText}>
          Anything someone else can do for{' '}
          <Text style={styles.tipRate}>{amount ? `${rateText}/hr` : 'your Buyback Rate'}</Text> or less shouldn't be yours.
        </Text>
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  column: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  button: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  leadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm + 2 },
  lead: { fontSize: 16, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  private: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  // The answer card: outlined in teal (the tip below is outlined in apricot), light inside. No inner
  // padding on the card itself: the body, then the hours strip running edge to edge along the bottom.
  hero: { borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface, overflow: 'hidden' },
  heroBody: { alignItems: 'center', paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.md + 4 },
  title: { color: colors.text, fontSize: 24, lineHeight: 30, fontWeight: '800', letterSpacing: -0.3 },
  big: { color: colors.accentText, fontWeight: '800', letterSpacing: -1, marginTop: spacing.xs },
  per: { fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  worthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm + 2,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: brand.apricot,
    backgroundColor: colors.accentSoft,
  },
  worthText: { color: colors.text, fontSize: 15, fontWeight: '600' },
  worthValue: { color: colors.accentText, fontWeight: '800' },
  basis: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.primarySoft,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  basisText: { color: colors.muted, fontSize: 13, fontWeight: '600' },
  // The tip: warm and filled, with a solid apricot icon, so it reads as the takeaway.
  tip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 4,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: brand.apricot,
    backgroundColor: colors.accentSoft,
  },
  tipIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot },
  tipText: { flex: 1, color: colors.text, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  tipRate: { color: colors.accentText, fontWeight: '800' },
});
