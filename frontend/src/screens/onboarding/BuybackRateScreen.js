import { useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { brand, cardShadow, radius, spacing } from '../../theme';

const MAX_COLUMN = 520; // tablets and big phones: a comfortable reading width, centred

/**
 * Journey step 1, "Know your worth", as one converter card (like a money converter): your yearly pay
 * goes in at the top (light half), your Buyback Rate comes out at the bottom (filled dark half), big,
 * with your hour's worth in an apricot chip and the 2,000 work hours it's based on. Under the card,
 * as a plain line, what it means for you. Everything follows what you type. With `editing` (from
 * Me) it saves the new pay.
 */
export default function BuybackRateScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, saveEdit } = useOnboarding();
  const { colors, isDark } = useTheme();
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
  const { width: screenWidth } = useWindowDimensions();
  const columnWidth = Math.min(screenWidth - 48, MAX_COLUMN);
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

      {/* The card and the tip together, centred in the room between the heading and the button. */}
      <View style={styles.middle}>
        {/* One card: the pay goes in at the top, the Buyback Rate comes out at the bottom. */}
        <View style={[styles.card, cardShadow(colors, isDark)]}>
          {/* In: your yearly pay (light half), in a soft filled field so it reads as "type here". */}
          <View style={styles.cardTop}>
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
              accessibilityLabel="Your yearly pay"
            />
          </View>

          {/* Out: your Buyback Rate (filled dark half), following what you type ("–" until there's a number). */}
          <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardBottom}>
            <Text style={styles.title}>Your Buyback Rate</Text>
            <Text style={[styles.big, { fontSize: bigFont, lineHeight: Math.round(bigFont * 1.2) }]} numberOfLines={1}>
              {rateText}
              {amount ? <Text style={[styles.per, { fontSize: Math.max(14, Math.round(bigFont * 0.42)) }]}>/hr</Text> : null}
            </Text>
            <View style={styles.worthChip}>
              <Ionicons name="time" size={14} color={brand.apricot} />
              <Text style={styles.worthText}>
                Your hour is worth <Text style={styles.worthValue}>{amount ? `${money(effectiveHourlyRate)}/hr` : '–'}</Text>
              </Text>
            </View>
            <Text style={styles.basis}>Based on {WORK_HOURS_PER_YEAR.toLocaleString('en-US')} work hours a year</Text>
          </LinearGradient>
        </View>

        {/* What it means for you: a plain line under the card, not another box. */}
        <View style={styles.tip}>
          <Ionicons name="bulb" size={20} color={colors.accentText} style={styles.tipIcon} />
          <Text style={styles.tipText}>
            Anything someone else can do for{' '}
            <Text style={styles.tipRate}>{amount ? `${rateText}/hr` : 'your Buyback Rate'}</Text> or less shouldn't be yours.
          </Text>
        </View>
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  column: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  button: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  // Centred between the heading and the button (lifted a little: the optical centre looks balanced).
  middle: { flex: 1, justifyContent: 'center', paddingBottom: spacing.lg },
  // The converter card: a light top (in) and a filled dark bottom (out), one rounded shape.
  card: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  cardTop: { paddingTop: spacing.md, paddingBottom: spacing.sm, paddingHorizontal: spacing.md + 2 },
  cardBottom: { alignItems: 'center', paddingTop: spacing.lg, paddingBottom: spacing.lg - 2, paddingHorizontal: spacing.md + 4 },
  leadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xs },
  lead: { fontSize: 15, fontWeight: '800', color: colors.text },
  private: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  title: { color: colors.heroText, fontSize: 20, lineHeight: 26, fontWeight: '800', letterSpacing: -0.2 },
  big: { color: brand.apricot, fontWeight: '800', letterSpacing: -1, marginTop: 2 },
  per: { fontWeight: '600', color: colors.heroMuted, letterSpacing: 0 },
  worthChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: 'rgba(245,185,113,0.55)',
    backgroundColor: 'rgba(245,185,113,0.16)',
  },
  worthText: { color: colors.heroText, fontSize: 15, fontWeight: '600' },
  worthValue: { color: brand.apricot, fontWeight: '800' },
  basis: { color: colors.heroMuted, fontSize: 12, fontWeight: '600', marginTop: spacing.sm + 2 },
  // The tip: a plain line with a bulb, the rate in warm amber.
  tip: { flexDirection: 'row', gap: spacing.sm + 2, alignItems: 'flex-start', marginTop: spacing.lg, paddingHorizontal: spacing.xs },
  tipIcon: { marginTop: 3 },
  tipText: { flex: 1, color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  tipRate: { color: colors.accentText, fontWeight: '800' },
});
