import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import DripMatrix from '../../components/DripMatrix';
import { Card, HeroCard } from '../../components/Card';
import { useOnboarding } from '../../context/OnboardingContext';
import { DRIP, quadrantFor, stepNumber, summarizeSchedule } from '../../constants/content';
import { formatHours, formatMoney } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

const WORKDAYS_PER_WEEK = 5;

export default function DripScreen({ navigation }) {
  const { onboarding, complete } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const rate = onboarding?.buybackRate || 0;
  const currency = onboarding?.currency || 'USD';
  const summary = summarizeSchedule(onboarding?.schedule, rate);
  const home = summary.dominant ? DRIP[summary.dominant] : null;
  const handoff = summary.firstHandoff;

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

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
    <Screen footer={<Button title="Start buying back my time" icon="arrow-forward" onPress={finish} loading={loading} />}>
      <StepHeader
        step={stepNumber('drip')}
        eyebrow="Your DRIP Matrix"
        title={home ? `You live in ${home.name}.` : 'Your DRIP Matrix'}
        subtitle={home?.advice}
      />

      <DripMatrix summary={summary} animate />

      {summary.drainingHours > 0 ? (
        <HeroCard style={styles.gap}>
          <Text style={styles.heroLabel}>What buying back looks like</Text>
          <Text style={styles.heroBig}>{formatHours(summary.drainingHours)} a day drain you</Text>
          <Text style={styles.heroBody}>
            Handing them off at your {formatMoney(rate, currency)}/hr Buyback Rate costs about{' '}
            {formatMoney(summary.dailyBuybackCost, currency, { decimals: 0 })} a day, and frees{' '}
            {formatHours(summary.drainingHours * WORKDAYS_PER_WEEK)} a week for Production.
          </Text>
        </HeroCard>
      ) : (
        <HeroCard style={styles.gap}>
          <Text style={styles.heroLabel}>Nice work</Text>
          <Text style={styles.heroBody}>Nothing in your day drains you. Keep protecting that.</Text>
        </HeroCard>
      )}

      {handoff ? (
        <Card style={styles.gap}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="hand-right-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>Your first handoff</Text>
              <Text style={styles.cardTitle}>
                {handoff.activity} · {formatHours(handoff.hours)}/day
              </Text>
            </View>
          </View>
          <Text style={styles.cardBody}>{DRIP[quadrantFor(handoff)].advice}</Text>
        </Card>
      ) : null}

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  gap: { marginTop: spacing.md },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroBig: { color: colors.heroText, fontSize: 26, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroBody: { color: colors.heroMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSoft,
  },
  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  cardBody: { fontSize: 14, lineHeight: 21, color: colors.muted, marginTop: spacing.sm },
});
