import { Text } from 'react-native';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import DripMatrix from '../components/DripMatrix';
import Button from '../components/Button';
import { HeroCard } from '../components/Card';
import { useOnboarding } from '../context/OnboardingContext';
import { DRIP, summarizeSchedule } from '../constants/content';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles } from '../theme/ThemeContext';
import { spacing } from '../theme';

/** Your DRIP Matrix, with a way to change your day after onboarding. */
export default function MyDayScreen({ navigation }) {
  const { onboarding } = useOnboarding();
  const styles = useStyles(makeStyles);
  const rate = onboarding?.buybackRate || 0;
  const currency = onboarding?.currency || 'USD';
  const summary = summarizeSchedule(onboarding?.schedule, rate);
  const home = summary.dominant ? DRIP[summary.dominant] : null;
  const count = (onboarding?.schedule || []).length;

  return (
    <Screen edges={['top']}>
      <PageHeader
        eyebrow="My day"
        title={home ? `You live in ${home.name}.` : 'Your DRIP Matrix'}
        subtitle={`${formatHours(summary.totalHours)} across ${count} ${count === 1 ? 'activity' : 'activities'}. ${home ? home.advice : ''}`}
      />

      <DripMatrix summary={summary} />

      {summary.drainingHours > 0 ? (
        <HeroCard style={styles.gap}>
          <Text style={styles.heroLabel}>What buying back looks like</Text>
          <Text style={styles.heroBig}>{formatHours(summary.drainingHours)} a day drain you</Text>
          <Text style={styles.heroBody}>
            Handing them off at your {formatMoney(rate, currency)}/hr Buyback Rate costs about{' '}
            {formatMoney(summary.dailyBuybackCost, currency, { decimals: 0 })} a day.
          </Text>
        </HeroCard>
      ) : null}

      <Button
        title="Edit your day"
        variant="secondary"
        icon="create-outline"
        onPress={() => navigation.navigate('Schedule', { editing: true })}
        style={styles.gap}
      />
      <Text style={styles.hint}>Add, change or remove activities. You'll only swipe the new ones.</Text>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  gap: { marginTop: spacing.md },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  heroBig: { color: colors.heroText, fontSize: 24, fontWeight: '800', letterSpacing: -0.5, marginTop: 4 },
  heroBody: { color: colors.heroMuted, fontSize: 15, lineHeight: 22, marginTop: spacing.sm },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
});
