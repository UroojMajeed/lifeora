import { useEffect, useState } from 'react';
import { Keyboard, Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
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
import { fitFontSize, formatMoney, groupDigits, sanitizeAmount } from '../../utils/format';
import { useStyles } from '../../theme/ThemeContext';
import { brand, radius, spacing } from '../../theme';

const SETTLE_MS = 150; // pause after the keyboard closes, before the rate card fades in
const MAX_COLUMN = 520; // tablets and big phones: a comfortable reading width, centred

/**
 * "What's your time worth?" (onboarding step 1): who you are and what your business pays you,
 * which reveals your Buyback Rate. With `editing` (from Me) it only changes the pay.
 */
export default function BuybackRateScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, saveEdit } = useOnboarding();
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
  // A pay you already gave (coming back, resuming, or editing from Me) shows its card straight away;
  // the reveal is only for the first time you type it.
  const [revealed, setRevealed] = useState(onboarding?.annualIncome != null);
  // Typing done: wait for the keyboard to finish closing (and the button to come back) so the card
  // fades into a still screen instead of while everything is moving.
  const [waiting, setWaiting] = useState(false);
  const reveal = () => {
    if (amount && !revealed) setWaiting(true);
  };
  useEffect(() => {
    if (!waiting) return undefined;
    let timer;
    const go = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        setWaiting(false);
        setRevealed(true);
      }, SETTLE_MS);
    };
    // If the keyboard is still up, start counting once it's gone; otherwise start now.
    const sub = Keyboard.addListener('keyboardDidHide', go);
    if (!Keyboard.isVisible()) go();
    return () => {
      sub.remove();
      clearTimeout(timer);
    };
  }, [waiting]);

  const ready = amount > 0 && (editing || Boolean(role));
  // Big rates (e.g. PKR 1,250,000) shrink to fit the card instead of running off the screen.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const columnWidth = Math.min(screenWidth - 48, MAX_COLUMN);
  const gap = screenHeight < 740 ? spacing.md : spacing.lg - 4; // 16 on short phones, 20 otherwise (fits without scrolling)
  const rateText = formatMoney(buybackRate, currency);
  // Both rates in one size that fits beside their labels.
  const rateFont = fitFontSize(`${formatMoney(Math.max(effectiveHourlyRate, buybackRate), currency)}/h`, columnWidth - 48 - 24 - 110, 22, 13);

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

  const buttonTitle = editing ? 'Save' : !role ? 'Choose what describes you' : amount <= 0 ? 'Add your yearly pay' : 'Map your routine';

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
        subtitle={editing ? 'A rough number is fine.' : 'Two quick answers and we work it out.'}
      />

      {!editing ? (
        <View style={{ marginTop: gap - spacing.lg }}>
          <Text style={styles.lead}>I am a…</Text>
          <RolePicker value={role} onChange={setRole} soft />
        </View>
      ) : null}

      <View style={!editing && { marginTop: gap }}>
        {!editing ? <Text style={styles.lead}>My business pays me each year…</Text> : null}
        <MoneyInput
          large
          currency={currency}
          onCurrencyChange={setCurrency}
          value={groupDigits(income)}
          onChangeText={(t) => setIncome(sanitizeAmount(t))}
          placeholder="120,000"
          accessibilityLabel="Yearly pay from your business"
          onBlur={reveal}
        />
      </View>

      {/* The answer is a reveal: it appears once you finish typing (Done, a tap outside or a scroll),
          fading in quietly. After that it follows any change. */}
      {revealed && amount ? (
        <Animated.View entering={FadeIn.duration(250)}>
          <HeroCard style={[styles.hero, { marginTop: gap }]}>
            {/* The main message first: what the rate means for you. */}
            <View style={styles.tip}>
              <Ionicons name="bulb" size={20} color={brand.apricot} />
              <Text style={styles.tipText}>
                Anything someone else can do for <Text style={styles.tipRate}>{rateText}/hr</Text> or less shouldn't be
                yours.
              </Text>
            </View>
            <View style={styles.divider} />
            {/* Two rows in the same type: what your hour is worth, then your Buyback Rate. */}
            <View style={styles.rateRow}>
              <Text style={styles.rateLabel} numberOfLines={2}>Your hour is worth</Text>
              <Text style={[styles.rateValue, { fontSize: rateFont }]} numberOfLines={1}>
                {formatMoney(effectiveHourlyRate, currency)}
                <Text style={styles.per}>/hr</Text>
              </Text>
            </View>
            <View style={[styles.rateRow, styles.rateMain]}>
              <Text style={[styles.rateLabel, styles.rateLabelMain]} numberOfLines={2}>Your Buyback Rate</Text>
              <Text style={[styles.rateValue, { fontSize: rateFont }]} numberOfLines={1}>
                {rateText}
                <Text style={styles.per}>/hr</Text>
              </Text>
            </View>
          </HeroCard>
        </Animated.View>
      ) : null}

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  column: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  button: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  lead: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm + 2, letterSpacing: -0.2 },
  hero: { padding: spacing.md + 4 },
  tip: { flexDirection: 'row', gap: spacing.sm + 2, alignItems: 'flex-start' },
  tipText: { flex: 1, fontSize: 17, lineHeight: 24, fontWeight: '800', color: colors.heroText, letterSpacing: -0.2 },
  tipRate: { color: brand.apricot },
  divider: { height: 1, backgroundColor: colors.heroDivider, marginVertical: spacing.md },
  rateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingHorizontal: 12, paddingVertical: 8 },
  rateMain: { marginTop: 6, borderRadius: radius.md, backgroundColor: colors.heroChip, borderWidth: 1, borderColor: 'rgba(245,185,113,0.6)' },
  rateLabel: { flex: 1, fontSize: 12, fontWeight: '700', color: colors.heroMuted, letterSpacing: 0.6, textTransform: 'uppercase' },
  rateLabelMain: { color: brand.apricot },
  rateValue: { fontWeight: '800', color: colors.heroText, letterSpacing: -0.4 },
  per: { fontSize: 13, fontWeight: '600', color: colors.heroMuted },
});
