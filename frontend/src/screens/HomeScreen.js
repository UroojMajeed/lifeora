import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import Wordmark from '../components/Wordmark';
import DripMatrix from '../components/DripMatrix';
import ThemeToggle from '../components/ThemeToggle';
import BuybackRingCard from '../components/BuybackRingCard';
import LoopTracker from '../components/LoopTracker';
import TodaysMoveCard from '../components/TodaysMoveCard';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { loadStreak, noticeBoughtBack } from '../storage/progress';
import { calculateBuybackRate, summarizeSchedule } from '../constants/content';
import { greeting, ideaOfTheDay, loopStatus, todaysMove } from '../constants/home';
import { dayNow, energyShare, scheduleNow } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// Home tab, built around one goal: buying back the hours that drain you.
// The headline ring, where you are in the Buyback Loop, and today's one move.
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, summary: handoffSummary, refresh: refreshHandoffs } = useHandoffs();
  const { colors, type } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [streak, setStreak] = useState(null);
  const [celebrate, setCelebrate] = useState(0);
  const [startingRound, setStartingRound] = useState(false);

  const schedule = onboarding?.schedule || [];
  const currency = onboarding?.currency || 'USD';
  // The matrix shows the day as it is now: handed-off tasks out, filled time in.
  const drip = summarizeSchedule(scheduleNow(dayNow(schedule, handoffs, fills)), onboarding?.buybackRate);
  const { effectiveHourlyRate } = calculateBuybackRate(onboarding?.annualIncome || 0);

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
      loadStreak().then(setStreak);
    }, [refreshHandoffs])
  );

  // More hours bought back since Home last showed them: celebrate (only while Home is on screen).
  const boughtBack = handoffSummary?.boughtBackHours;
  useEffect(() => {
    if (!isFocused || boughtBack === undefined) return;
    noticeBoughtBack(boughtBack).then((up) => {
      if (!up) return;
      setCelebrate((n) => n + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, [isFocused, boughtBack]);

  const move = handoffSummary ? todaysMove({ schedule, handoffs, summary: handoffSummary }) : null;

  // Round complete: close it, then re-audit the day (edit it, then swipe everything again).
  const doMove = async () => {
    if (!move) return;
    if (move.action !== 'nextRound') {
      navigation.navigate(...move.go);
      return;
    }
    setStartingRound(true);
    try {
      const res = await api.startNextRound();
      replaceOnboarding(res.onboarding);
      await refreshHandoffs();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.navigate(...move.go);
    } catch (err) {
      Alert.alert("Couldn't start the next round", err.message);
    } finally {
      setStartingRound(false);
    }
  };
  const loop = loopStatus({ schedule, summary: handoffSummary });
  // Once there's real progress to lose, invite guests to save it (never before: no sign-up wall).
  const askToSave = user?.isGuest && (handoffSummary?.done || 0) > 0;

  return (
    <Screen edges={[]}>
      <View style={[styles.header, { marginTop: insets.top + spacing.sm }]}>
        <Logo size={44} />
        <View style={styles.brandText}>
          <Wordmark height={24} color={colors.text} />
          <Text style={styles.greeting}>{greeting()}. Let's buy back your time.</Text>
        </View>
        <ThemeToggle />
      </View>

      <BuybackRingCard
        summary={handoffSummary}
        share={handoffSummary ? energyShare(schedule, handoffSummary) : null}
        effectiveHourlyRate={effectiveHourlyRate}
        buybackRate={onboarding?.buybackRate}
        currency={currency}
        streak={streak}
        celebrate={celebrate}
        onPress={() => navigation.navigate('Handoffs')}
      />

      <LoopTracker status={loop} round={handoffSummary?.round} style={styles.gap} />

      <TodaysMoveCard move={move} onPress={doMove} loading={startingRound} style={styles.gap} />

      {askToSave ? (
        <Pressable
          onPress={() => navigation.navigate('Account', { mode: 'save' })}
          accessibilityRole="button"
          style={({ pressed }) => [styles.save, pressed && { opacity: 0.85 }]}
        >
          <Ionicons name="cloud-upload-outline" size={22} color={colors.primaryDark} />
          <View style={{ flex: 1 }}>
            <Text style={styles.saveTitle}>Save your progress</Text>
            <Text style={styles.saveText}>Keep your handoffs safe if you change phones. Takes 10 seconds.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.muted} />
        </Pressable>
      ) : null}

      <View style={styles.idea}>
        <Ionicons name="bulb" size={18} color={colors.accent} />
        <View style={{ flex: 1 }}>
          <Text style={styles.ideaLabel}>Buyback idea</Text>
          <Text style={styles.ideaText}>{ideaOfTheDay()}</Text>
        </View>
      </View>

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
        <DripMatrix summary={drip} compact />
      </Pressable>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  brandText: { flex: 1, gap: 4 },
  greeting: { fontSize: 14, fontWeight: '600', color: colors.muted },
  gap: { marginTop: spacing.md },
  idea: {
    flexDirection: 'row',
    gap: spacing.sm + 4,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  save: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  saveTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  saveText: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  ideaLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 1 },
  ideaText: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: 4 },
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
