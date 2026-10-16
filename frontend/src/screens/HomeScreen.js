import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import ThemeToggle from '../components/ThemeToggle';
import RoutineStats from '../components/RoutineStats';
import { DelegateAsk, DrainCompare, MoveCard, ProgressHero, ProgressWaiting, WeeklyChart } from '../components/HomeCards';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack, recordWeeklyBoughtBack } from '../storage/progress';
import { loadMotivation } from '../storage/motivation';
import { WORKDAYS_PER_WEEK, greeting, todaysMove } from '../constants/home';
import { dayNow, scheduleNow } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/**
 * Home, in two states. First visit (nothing bought back yet): your routine as a bar graph with the
 * insight under it (what drains you, your biggest drain), then your first move, then a small waiting
 * ring for hours bought back. After the first handoff, progress takes the top: your "why" and the
 * hours bought back a week (and what they're worth), a column per week, draining hours before vs now,
 * then today's move. The full routine graph stays on the Routine tab.
 */
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, summary, refresh: refreshHandoffs, update } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isFocused = useIsFocused();
  const [startingRound, setStartingRound] = useState(false);
  const [why, setWhy] = useState(null); // the "Your why" photo and words, from Me
  const [weeks, setWeeks] = useState([]); // hours bought back, week by week

  const schedule = onboarding?.schedule || [];
  // Your routine as it is now: handed-off tasks out, filled time in.
  const routineNow = scheduleNow(dayNow(schedule, handoffs, fills));

  const draining = summary?.drainingHours || 0; // a day, at the audit
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const boughtWeek = bought * WORKDAYS_PER_WEEK;
  // The switch: once something is bought back, progress leads.
  const started = bought > 0;

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
      loadMotivation().then(setWhy);
    }, [refreshHandoffs])
  );

  // This week's hours bought back join the weekly history (kept on this phone).
  useEffect(() => {
    if (summary) recordWeeklyBoughtBack(boughtWeek).then(setWeeks);
  }, [summary, boughtWeek]);

  // More hours bought back since Home last showed them: a small success buzz (only while on screen).
  useEffect(() => {
    if (!isFocused || summary?.boughtBackHours === undefined) return;
    noticeBoughtBack(summary.boughtBackHours).then((up) => {
      if (up) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, [isFocused, summary?.boughtBackHours]);

  const move = summary ? todaysMove({ schedule, handoffs, summary }) : null;
  // The first move: the biggest drain not handed off yet, asked simply (have you delegated it?).
  const firstTask = handoffs.filter((x) => x.status === 'mine' || x.status === 'in_progress').sort((a, b) => b.hours - a.hours)[0];
  const delegated = (activity) =>
    update(activity, { status: 'done' }).catch((err) => Alert.alert("Couldn't save that", err.message));

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
            {/* Progress and the "why" take the top. */}
            <ProgressHero
              boughtWeek={boughtWeek}
              drainingWeek={draining * WORKDAYS_PER_WEEK}
              buybackRate={onboarding?.buybackRate}
              currency={onboarding?.currency || 'USD'}
              why={why}
              onPress={() => navigation.navigate('Handoffs')}
            />
            <WeeklyChart weeks={weeks} />
            <DrainCompare before={draining} now={Math.max(0, draining - bought)} />
            <MoveCard move={move} onPress={doMove} loading={startingRound} />
          </>
        ) : (
          <>
            {/* First visit: the routine, said in a graph and in words; the first move; progress waits. */}
            <RoutineStats items={routineNow} />
            {/* New tasks to rate come first; otherwise one simple question about the biggest drain. */}
            {move?.stage === 'audit' || !firstTask ? (
              <MoveCard move={move} first onPress={doMove} loading={startingRound} />
            ) : (
              <DelegateAsk task={firstTask} onYes={delegated} onPlan={(activity) => navigation.navigate('HandoffDetail', { activity })} />
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
    </Screen>
  );
}

const makeStyles = (colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.md },
  hello: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  stack: { gap: spacing.md },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  saveText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
