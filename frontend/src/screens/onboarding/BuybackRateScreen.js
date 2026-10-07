import { useEffect, useRef, useState } from 'react';
import { Text, View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
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
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { brand, radius, spacing } from '../../theme';

const MAX_COLUMN = 520; // tablets and big phones: a comfortable reading width, centred

/** A number that counts up (or down) to its new value, so the result feels like a reveal. */
function useCountUp(target, duration = 600) {
  const [shown, setShown] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = Date.now();
    const begin = from.current;
    let frame;
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setShown(begin + (target - begin) * eased);
      if (t < 1) frame = requestAnimationFrame(tick);
      else from.current = target;
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      from.current = target;
    };
  }, [target, duration]);
  return shown;
}

/**
 * "What's your time worth?" (onboarding step 1): who you are and what your business pays you,
 * which reveals your Buyback Rate. With `editing` (from Me) it only changes the pay.
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
  const shownRate = useCountUp(buybackRate);
  const ready = amount > 0 && (editing || Boolean(role));
  // Big rates (e.g. PKR 1,250,000) shrink to fit the card instead of running off the screen.
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const columnWidth = Math.min(screenWidth - 48, MAX_COLUMN);
  const gap = screenHeight < 700 ? spacing.lg - 4 : spacing.xl - 4; // 20 on short phones, 28 otherwise
  const rateText = formatMoney(shownRate, currency);
  const bigFont = fitFontSize(`${formatMoney(buybackRate, currency)}/h`, columnWidth - 48, 48, 22);

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

  const buttonTitle = editing ? 'Save' : !role ? 'Choose what describes you' : amount <= 0 ? 'Add your yearly pay' : 'Continue';

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
        <Animated.View entering={FadeInDown.duration(380)} style={{ marginTop: gap - spacing.lg }}>
          <Text style={styles.lead}>I am a…</Text>
          <RolePicker value={role} onChange={setRole} soft />
        </Animated.View>
      ) : null}

      <Animated.View entering={FadeInDown.duration(380).delay(80)} style={!editing && { marginTop: gap }}>
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
      </Animated.View>

      {/* The answer: hidden until there's a number, then it fades in and counts up. */}
      {amount ? (
        <Animated.View entering={FadeIn.duration(350)}>
          <HeroCard style={{ marginTop: gap }}>
            <View style={styles.heroTop}>
              <Text style={styles.heroLabel}>Your Buyback Rate</Text>
              <View style={styles.worth}>
                <Text style={styles.worthText} numberOfLines={1}>
                  Your hour is worth {formatMoney(effectiveHourlyRate, currency, { decimals: 0 })}
                </Text>
              </View>
            </View>
            <Text style={[styles.big, { fontSize: bigFont }]} numberOfLines={1}>
              {rateText}
              <Text style={[styles.per, { fontSize: Math.max(14, Math.round(bigFont * 0.42)) }]}>/hr</Text>
            </Text>
            <View style={styles.divider} />
            <View style={styles.tip}>
              <Ionicons name="bulb" size={16} color={brand.apricot} />
              <Text style={styles.tipText}>
                If a task you don't enjoy can be done by someone else for {formatMoney(buybackRate, currency)}/hr or less, it
                shouldn't be yours.
              </Text>
            </View>
          </HeroCard>
        </Animated.View>
      ) : (
        <View style={[styles.placeholder, { marginTop: gap }]}>
          <Ionicons name="sparkles-outline" size={22} color={colors.muted} />
          <Text style={styles.placeholderText}>
            Your Buyback Rate appears here: what you can afford to pay someone to take tasks off your plate.
          </Text>
        </View>
      )}

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  column: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  button: { width: '100%', maxWidth: MAX_COLUMN, alignSelf: 'center' },
  lead: { fontSize: 16, fontWeight: '800', color: colors.text, marginBottom: spacing.sm + 2, letterSpacing: -0.2 },
  heroTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  worth: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.heroChip },
  worthText: { color: colors.heroText, fontSize: 12, fontWeight: '700' },
  big: { color: colors.heroText, fontSize: 48, fontWeight: '800', letterSpacing: -1, marginTop: spacing.xs },
  per: { fontSize: 20, fontWeight: '600', color: colors.heroMuted },
  divider: { height: 1, backgroundColor: colors.heroDivider, marginVertical: spacing.md },
  tip: { flexDirection: 'row', gap: spacing.sm },
  tipText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.heroMuted },
  placeholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  placeholderText: { flex: 1, fontSize: 14, lineHeight: 21, color: colors.muted },
});
