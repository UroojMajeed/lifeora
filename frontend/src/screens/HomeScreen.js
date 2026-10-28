import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import ThemeToggle from '../components/ThemeToggle';
import RoutineStats from '../components/RoutineStats';
import ReinvestCard from '../components/ReinvestCard';
import TimeBackCard from '../components/TimeBackCard';
import JourneyPreviewCard from '../components/JourneyPreviewCard';
import SettleInCard from '../components/SettleInCard';
import { settleDue } from '../constants/journey';
import CardHeader, { homeCard } from '../components/CardHeader';
import Button from '../components/Button';
import { checkInStatus, weekKey } from '../constants/checkin';
import MilestoneSheet from '../components/MilestoneSheet';
import { markMilestones } from '../storage/milestones';
import { milestoneLine, reachedMilestones } from '../constants/milestones';
import { MoveCard, ProductionCompare, ProgressWaiting } from '../components/HomeCards';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack, recordWeeklyBoughtBack } from '../storage/progress';
import { quadrantFor, valueForMoney } from '../constants/content';
import { WORKDAYS_PER_WEEK, greeting, todaysMove } from '../constants/home';
import { dayNow, scheduleNow } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/**
 * Home, in two states. First visit (nothing bought back yet): your routine as a bar graph with the
 * insight under it (what drains you, your biggest drain), then your first move, then a small waiting
 * ring for hours bought back. After the first handoff: the same graph (your routine now), your next
 * move, Reinvest (give the freed hours a new job), and your production time before vs now (plus
 * what you reinvested in it).
 */
// The milestone celebration sheet on Home. Off for now (the user asked to hide it).
const SHOW_MILESTONE_SHEET = false;

export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, checkIns = [], summary, refresh: refreshHandoffs, updateFills } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isFocused = useIsFocused();
  const [startingRound, setStartingRound] = useState(false);
  const [timeBack, setTimeBack] = useState({ weeks: [], totalHours: 0 }); // hours bought back, week by week
  const [milestone, setMilestone] = useState(null); // a new one to celebrate

  const schedule = onboarding?.schedule || [];
  // Your routine as it is now: handed-off tasks out, filled time in.
  const routineNow = scheduleNow(dayNow(schedule, handoffs, fills));

  const draining = summary?.drainingHours || 0; // a day, at the audit
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  // The switch: once something is bought back, progress leads.
  const started = bought > 0;

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
    }, [refreshHandoffs])
  );

  // This week's hours bought back join the weekly history (kept on this phone), for the time-back card.
  useEffect(() => {
    if (!summary) return;
    // A check-in confirms its week. This week, tasks handed off after the check-in (a new one, or one
    // that slipped and came back) add on top of what it confirmed.
    const thisWeek = weekKey();
    const after = (at) =>
      handoffs.filter((x) => x.status === 'done' && x.doneAt && new Date(x.doneAt) > new Date(at)).reduce((t, x) => t + x.hours * WORKDAYS_PER_WEEK, 0);
    const confirmed = Object.fromEntries(checkIns.map((x) => [x.week, (x.confirmedHours || 0) + (x.week === thisWeek && x.at ? after(x.at) : 0)]));
    recordWeeklyBoughtBack(bought * WORKDAYS_PER_WEEK, 6, confirmed).then(setTimeBack);
  }, [summary, bought, checkIns, handoffs]);

  // The weekly check-in: a card on Home when it's ready (Friday to Sunday).
  const checkIn = checkInStatus({ checkIns, handoffs, fills });
  // Last check-in's reinvested hours not (fully) used: a gentle word on the Reinvest card.
  const lastCheckIn = checkIns[checkIns.length - 1];
  const reinvestNudge = lastCheckIn?.fills?.some((x) => x.answer !== 'yes') ? 'Protect your reinvested hours this week' : null;

  // A milestone reached since last time: celebrate the newest one, once (only while on screen).
  useEffect(() => {
    if (!isFocused || !summary) return;
    // Finished weeks only: this week's hours count once the week has really happened.
    const done = timeBack.totalHours - (timeBack.weeks.find((w) => w.now)?.hours || 0);
    markMilestones(reachedMilestones({ hours: done, round: summary.round || 1 })).then((fresh) => {
      // Hidden for now: milestones are still saved (badges on Me), but the sheet does not slide up.
      if (SHOW_MILESTONE_SHEET && fresh.length) setMilestone(fresh[fresh.length - 1]);
    });
  }, [isFocused, summary, timeBack]);

  // More hours bought back since Home last showed them: a small success buzz (only while on screen).
  useEffect(() => {
    if (!isFocused || summary?.boughtBackHours === undefined) return;
    noticeBoughtBack(summary.boughtBackHours).then((up) => {
      if (up) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, [isFocused, summary?.boughtBackHours]);

  const move = summary ? todaysMove({ schedule, handoffs, summary }) : null;
  // The first move: a drain not handed off yet, handed off step by step (the journey).
  const firstTask = handoffs.filter((x) => x.status === 'mine' || x.status === 'in_progress').sort((a, b) => b.hours - a.hours)[0];
  const openJourney = (activity, openKind) => navigation.navigate('HandoffJourney', { activity, openKind });
  const settle = settleDue(handoffs);

  // Production time at the audit (the hours freed by delegating are added on top).
  const productionBefore = schedule
    .filter((a) => a.energy && a.hours)
    .filter((a) => (a.quadrant || quadrantFor({ value: a.money ? valueForMoney(a.money) : a.value, energy: a.energy })) === 'production')
    .reduce((t, a) => t + a.hours, 0);

  // Production now: what it was, plus the freed hours you reinvested in it.
  const reinvestedInProduction = fills.filter((x) => x.quadrant === 'production').reduce((t, x) => t + x.hours, 0);
  const saveFills = (next) =>
    updateFills(next).catch((err) => {
      Alert.alert("Couldn't save that", err.message);
      throw err;
    });

  // The move's button; a finished round starts the next one first.
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

  // Once there's real progress to lose, invite guests to save it (never before: no sign-up wall).
  const askToSave = user?.isGuest && (summary?.done || 0) > 0;
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : '';

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hello} numberOfLines={1}>
          {started ? greeting() : 'Welcome'}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <ThemeToggle />
      </View>

      {/* Keyed by the layout, so the switch to progress (after your first "Yes") fades in gently. */}
      <Animated.View key={started ? 'progress' : 'first'} entering={FadeIn.duration(500)} style={styles.stack}>
        {started ? (
          <>
            {/* After a handoff: your hours back, your routine now, what to do next, Reinvest, and production. */}
            {checkIn.state === 'due' ? (
              <View style={styles.checkIn}>
                <CardHeader icon="pulse" iconColor={colors.primary} title="Your Weekly Check-in" sub="Ready · about 2 minutes" />
                <Button title="Start check-in" icon="arrow-forward" onPress={() => navigation.navigate('CheckIn')} style={styles.checkInButton} />
              </View>
            ) : null}
            {settle ? <SettleInCard key={`${settle.task.activity}-${settle.day}`} due={settle} onOpen={openJourney} /> : null}
            <TimeBackCard weeks={timeBack.weeks} totalHours={timeBack.totalHours} />
            <RoutineStats
              items={routineNow}
              free={Math.max(0, bought - fills.reduce((t, x) => t + x.hours, 0))}
              handedOff={handoffs.filter((x) => x.status === 'done').length}
              tip={false}
            />
            {/* New tasks to rate, or the next drain to delegate. Once all are delegated, Reinvest below is
                the next step (no separate "fill" move); when that's done too, round 2 starts here. */}
            {move?.stage === 'audit' || move?.action === 'nextRound' ? (
              <MoveCard move={move} onPress={doMove} loading={startingRound} />
            ) : firstTask ? (
              <JourneyPreviewCard handoffs={handoffs} onOpen={openJourney} next />
            ) : null}
            <ReinvestCard free={bought} fills={fills} role={onboarding?.role} schedule={schedule} onSave={saveFills} nudge={reinvestNudge} />
            <ProductionCompare before={productionBefore} gain={reinvestedInProduction} />
          </>
        ) : (
          <>
            {/* First visit: the routine, said in a graph and in words; the first move; progress waits. */}
            <RoutineStats items={routineNow} />
            {/* New tasks to rate come first; otherwise the biggest drain, handed off step by step. */}
            {move?.stage === 'audit' || !firstTask ? (
              <MoveCard move={move} first onPress={doMove} loading={startingRound} />
            ) : (
              <JourneyPreviewCard handoffs={handoffs} onOpen={openJourney} />
            )}
            <ProgressWaiting />
          </>
        )}

        {askToSave ? (
          <Pressable onPress={() => navigation.navigate('Account', { mode: 'save' })} hitSlop={8} style={styles.save} accessibilityRole="button">
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
            <Text style={styles.saveText}>Save your progress</Text>
          </Pressable>
        ) : null}
      </Animated.View>
      <MilestoneSheet milestone={milestone} line={milestone ? milestoneLine(milestone) : ''} onClose={() => setMilestone(null)} />
    </Screen>
  );
}

const makeStyles = (colors, isDark) => ({
  checkIn: { ...homeCard(colors, isDark), backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  checkInButton: { marginTop: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.md },
  hello: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  stack: { gap: spacing.md },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  saveText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
