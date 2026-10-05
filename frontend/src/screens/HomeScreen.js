import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import Wordmark from '../components/Wordmark';
import DripMatrix from '../components/DripMatrix';
import ThemeToggle from '../components/ThemeToggle';
import MotivationCard from '../components/MotivationCard';
import BoughtBackCard from '../components/BoughtBackCard';
import { Card, HeroCard } from '../components/Card';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { loadMotivation } from '../storage/motivation';
import { summarizeSchedule } from '../constants/content';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing, withAlpha } from '../theme';

// Home tab: your rate, progress, this week's move and your DRIP Matrix at a glance.
// Settings live in the Me tab; the full matrix and day editing live in My day.
export default function HomeScreen({ navigation }) {
  const { onboarding } = useOnboarding();
  const { handoffs, summary: handoffSummary, refresh: refreshHandoffs } = useHandoffs();
  const { colors, type } = useTheme();
  const styles = useStyles(makeStyles);
  const currency = onboarding?.currency || 'USD';
  const summary = summarizeSchedule(onboarding?.schedule, onboarding?.buybackRate);
  const insets = useSafeAreaInsets();
  const [motivation, setMotivation] = useState(null);
  const hasPhoto = Boolean(motivation?.uri);

  useEffect(() => {
    loadMotivation().then(setMotivation);
  }, []);

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
    }, [refreshHandoffs])
  );

  // This week's move: the next draining task that isn't handed off yet (Delegation first).
  const nextMove = handoffs.find((h) => h.status !== 'done');
  const allDone = handoffs.length > 0 && !nextMove;
  const openHandoffs = () => navigation.navigate('Handoffs');

  const whyCard = motivation ? <MotivationCard motivation={motivation} onChange={setMotivation} style={styles.why} /> : null;

  return (
    <Screen edges={[]}>
      {hasPhoto ? (
        // The user's "why", softly blurred behind the top of Home and fading into the page.
        <View style={[styles.backdrop, { height: insets.top + 320 }]} pointerEvents="none">
          <Image source={{ uri: motivation.uri }} style={styles.backdropImage} blurRadius={28} resizeMode="cover" />
          <LinearGradient
            colors={[withAlpha(colors.background, 0.35), withAlpha(colors.background, 0.7), colors.background]}
            locations={[0, 0.6, 1]}
            style={styles.backdropImage}
          />
        </View>
      ) : null}

      <View style={[styles.header, { marginTop: insets.top + spacing.sm }]}>
        <Logo size={44} />
        <View style={styles.brandText}>
          <Wordmark height={24} color={colors.text} />
          <Text style={styles.greeting}>Buy back your time.</Text>
        </View>
        <ThemeToggle />
      </View>

      {whyCard}

      <HeroCard>
        <Text style={styles.heroLabel}>Your Buyback Rate</Text>
        <Text style={styles.rate} adjustsFontSizeToFit numberOfLines={1}>
          {formatMoney(onboarding?.buybackRate, currency)}
          <Text style={styles.per}>/hr</Text>
        </Text>
        <Text style={styles.heroBody}>If a draining task can be done for this or less, it shouldn't be yours.</Text>
      </HeroCard>

      <BoughtBackCard summary={handoffSummary} onPress={openHandoffs} style={styles.gap} />

      {nextMove || allDone || summary.firstHandoff ? (
        <Pressable
          onPress={() => (nextMove ? navigation.navigate('HandoffDetail', { activity: nextMove.activity }) : openHandoffs())}
          accessibilityRole="button"
          style={({ pressed }) => [styles.gap, pressed && { opacity: 0.9 }]}
        >
          <Card>
            <View style={styles.cardRow}>
              <View style={styles.iconWrap}>
                <Ionicons name={allDone ? 'trophy-outline' : 'flag-outline'} size={20} color={colors.accentText} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardLabel}>{allDone ? 'All handed off' : "This week's move"}</Text>
                <Text style={styles.cardTitle}>
                  {allDone
                    ? 'Every draining task is off your plate'
                    : `${nextMove?.status === 'in_progress' ? 'Finish handing off' : 'Hand off'} ${(nextMove || summary.firstHandoff).activity.toLowerCase()}`}
                </Text>
                <Text style={styles.cardBody}>
                  {allDone
                    ? 'Fill those hours with work that energizes you.'
                    : `Buys back ${formatHours((nextMove || summary.firstHandoff).hours)} a day.`}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.muted} />
            </View>
          </Card>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => navigation.navigate('MyDay')}
        accessibilityRole="button"
        accessibilityLabel="Your DRIP Matrix. Open My day"
        style={({ pressed }) => pressed && { opacity: 0.9 }}
      >
        <View style={styles.sectionRow}>
          <Text style={type.label}>Your DRIP Matrix</Text>
          <View style={styles.link}>
            <Text style={styles.linkText}>My day</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </View>
        </View>
        <DripMatrix summary={summary} compact />
      </Pressable>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  why: { marginBottom: spacing.md },
  backdrop: { position: 'absolute', top: 0, left: -spacing.lg, right: -spacing.lg, overflow: 'hidden' },
  backdropImage: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, width: '100%', height: '100%' },
  brandText: { flex: 1, gap: 4 },
  greeting: { fontSize: 15, fontWeight: '600', color: colors.muted },
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
  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.accentText, textTransform: 'uppercase', letterSpacing: 1 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginTop: 2 },
  cardBody: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 2 },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
