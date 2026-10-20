import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import ThemeToggle from '../components/ThemeToggle';
import { DelegationList, MoveBlock, ProductionCard, RoutineCard, h, hoursByQuadrant } from '../components/HomeBlocks';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack } from '../storage/progress';
import { WORKDAYS_PER_WEEK, greeting, todaysMove } from '../constants/home';
import { dayNow, scheduleNow } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/**
 * One Home, four blocks: your routine (the day by quadrant, and what each means), your next move (the
 * next draining task to hand off, Delegation first), your production time (growing with each task
 * you delegate), and the delegation list (tap a task to mark it delegated). The detailed handoff
 * steps stay on the Handoffs tab ("Plan it").
 */
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, summary, refresh: refreshHandoffs, update } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isFocused = useIsFocused();
  const [startingRound, setStartingRound] = useState(false);

  const schedule = onboarding?.schedule || [];
  // Your routine as it is now: handed-off tasks out, filled time in.
  const routineNow = scheduleNow(dayNow(schedule, handoffs, fills));
  // Production: what it was at the audit, plus every hour handed off.
  const audit = hoursByQuadrant(schedule);
  const draining = summary?.drainingHours || 0;
  const bought = Math.min(summary?.boughtBackHours || 0, draining);

  // Fresh numbers every time Home comes back into view (e.g. after planning a handoff).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
    }, [refreshHandoffs])
  );

  // More hours bought back since Home last showed them: a small success buzz (only while on screen).
  useEffect(() => {
    if (!isFocused || summary?.boughtBackHours === undefined) return;
    noticeBoughtBack(summary.boughtBackHours).then((up) => {
      if (up) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, [isFocused, summary?.boughtBackHours]);

  const move = summary ? todaysMove({ schedule, handoffs, summary }) : null;
  // Handoffs come Delegation first, then Replacement, biggest first; the next one is the first not done.
  const next = handoffs.find((x) => x.status !== 'done' && x.status !== 'later');
  const doneCount = handoffs.filter((x) => x.status === 'done').length;
  const allDone = handoffs.length > 0 && !next;

  const setDelegated = (activity, on) =>
    update(activity, { status: on ? 'done' : 'mine' }).catch((err) => Alert.alert("Couldn't save that", err.message));

  const startNextRound = async () => {
    setStartingRound(true);
    try {
      const res = await api.startNextRound();
      replaceOnboarding(res.onboarding);
      await refreshHandoffs();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.navigate('Audit', { round: (summary?.round || 1) + 1 });
    } catch (err) {
      Alert.alert("Couldn't start the next round", err.message);
    } finally {
      setStartingRound(false);
    }
  };

  // Once there's real progress to lose, invite guests to save it (never before: no sign-up wall).
  const askToSave = user?.isGuest && doneCount > 0;
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : '';

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headText}>
          <Text style={styles.hello} numberOfLines={1}>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </Text>
          <Text style={styles.sub}>
            {bought > 0 ? `You've bought back ${h(bought)} a day so far.` : "Here's your day. Let's buy some of it back."}
          </Text>
        </View>
        <ThemeToggle />
      </View>

      <View style={styles.stack}>
        <View>
          <Text style={styles.section}>Your routine</Text>
          <RoutineCard items={routineNow} />
        </View>

        <MoveBlock
          audit={move?.stage === 'audit' ? move : null}
          task={next}
          first={doneCount === 0}
          allDone={allDone}
          boughtWeek={bought * WORKDAYS_PER_WEEK}
          loading={startingRound}
          onAudit={() => move && navigation.navigate(...move.go)}
          onDelegated={(activity) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            setDelegated(activity, true);
          }}
          onPlan={(activity) => navigation.navigate('HandoffDetail', { activity })}
          onNextRound={startNextRound}
        />

        <ProductionCard base={audit.by.production} gain={bought} day={audit.total} />

        <DelegationList handoffs={handoffs} onToggle={setDelegated} />

        {askToSave ? (
          <Pressable onPress={() => navigation.navigate('Account', { mode: 'save' })} hitSlop={8} style={styles.save} accessibilityRole="button">
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
            <Text style={styles.saveText}>Save your progress</Text>
          </Pressable>
        ) : null}
      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, paddingTop: spacing.sm, marginBottom: spacing.lg },
  headText: { flex: 1 },
  hello: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  sub: { fontSize: 15, color: colors.muted, marginTop: 4 },
  stack: { gap: spacing.lg },
  section: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.sm },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5 },
  saveText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
