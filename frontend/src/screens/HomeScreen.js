import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import DripMatrix from '../components/DripMatrix';
import Segmented from '../components/Segmented';
import ThemeToggle from '../components/ThemeToggle';
import MotivationCard from '../components/MotivationCard';
import { Card, HeroCard } from '../components/Card';
import { useOnboarding } from '../context/OnboardingContext';
import { summarizeSchedule } from '../constants/content';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

const THEME_OPTIONS = [
  { key: 'system', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

// Home dashboard. More tools (Time & Energy Audit, Perfect Week) come next.
export default function HomeScreen() {
  const { onboarding } = useOnboarding();
  const { colors, type, mode, setMode } = useTheme();
  const styles = useStyles(makeStyles);
  const currency = onboarding?.currency || 'USD';
  const summary = summarizeSchedule(onboarding?.schedule, onboarding?.buybackRate);

  return (
    <Screen>
      <View style={styles.header}>
        <Logo size={44} />
        <View style={{ flex: 1 }}>
          <Text style={type.label}>Reclaim</Text>
          <Text style={styles.greeting}>Buy back your time.</Text>
        </View>
        <ThemeToggle />
      </View>

      <MotivationCard style={styles.why} />

      <HeroCard>
        <Text style={styles.heroLabel}>Your Buyback Rate</Text>
        <Text style={styles.rate} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(onboarding?.buybackRate, currency)}
          <Text style={styles.per}>/hr</Text>
        </Text>
        <Text style={styles.heroBody}>If a draining task can be done for this or less, it shouldn't be yours.</Text>
      </HeroCard>

      {summary.firstHandoff ? (
        <Card style={styles.gap}>
          <View style={styles.cardRow}>
            <View style={styles.iconWrap}>
              <Ionicons name="flag-outline" size={20} color={colors.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardLabel}>This week's move</Text>
              <Text style={styles.cardTitle}>Hand off {summary.firstHandoff.activity.toLowerCase()}</Text>
              <Text style={styles.cardBody}>Buys back {formatHours(summary.firstHandoff.hours)} a day.</Text>
            </View>
          </View>
        </Card>
      ) : null}

      <Text style={[type.label, styles.section]}>Your DRIP Matrix</Text>
      <DripMatrix summary={summary} compact />

      <Card style={styles.gap}>
        <View style={styles.cardRow}>
          <View style={[styles.iconWrap, { backgroundColor: colors.primarySoft }]}>
            <Ionicons name="sparkles-outline" size={20} color={colors.primaryDark} />
          </View>
          <Text style={[styles.cardBody, { flex: 1, marginTop: 0 }]}>
            Coming next: a 2-week Time & Energy Audit, your Replacement Ladder, and your Perfect Week.
          </Text>
        </View>
      </Card>

      <Text style={[type.label, styles.section]}>Appearance</Text>
      <View style={styles.themeRow}>
        <Segmented options={THEME_OPTIONS} value={mode} onChange={setMode} accessibilityLabel="App theme" />
      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm, marginBottom: spacing.lg },
  why: { marginBottom: spacing.md },
  greeting: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  heroLabel: { color: colors.heroMuted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  rate: { color: colors.heroText, fontSize: 44, fontWeight: '800', letterSpacing: -1, marginTop: 4 },
  per: { fontSize: 20, fontWeight: '600', color: colors.heroMuted },
  heroBody: { color: colors.heroMuted, fontSize: 14, lineHeight: 20, marginTop: spacing.xs },
  gap: { marginTop: spacing.md },
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
  cardBody: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  themeRow: { flexDirection: 'row' },
});
