import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import { Card } from '../components/Card';
import HoursBackCard from '../components/HoursBackCard';
import RoutineStats from '../components/RoutineStats';
import { DelegationCard, ReinvestCard } from '../components/JourneyStepCards';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack } from '../storage/progress';
import { loadReminders, setReminder } from '../storage/reminders';
import { greeting, todaysMove } from '../constants/home';
import { dayNow, scheduleNow } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * Home, where the journey continues after onboarding. First your routine at a glance (one bar of
 * your day split by quadrant, and a tile per quadrant: its share, hours, meaning and tasks). Then the
 * journey's last two steps: Delegation (your next handoff, highlighted) and Reinvest (freed time
 * waiting for a new job). Last, your progress (hours back, with rings). When something else comes
 * first (new tasks to rate, or a finished round), it shows on top with one button.
 */
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, summary, refresh: refreshHandoffs, update } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isFocused = useIsFocused();
  const [startingRound, setStartingRound] = useState(false);
  const [reminders, setReminders] = useState({}); // "Remind me later" times, kept on this phone

  const schedule = onboarding?.schedule || [];
  // Your routine as it is now: handed-off tasks out, filled time in.
  const routineNow = scheduleNow(dayNow(schedule, handoffs, fills));

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
      loadReminders().then(setReminders);
    }, [refreshHandoffs])
  );

  // More hours bought back since Home last showed them: a small success buzz (only while on screen).
  const boughtBack = summary?.boughtBackHours;
  useEffect(() => {
    if (!isFocused || boughtBack === undefined) return;
    noticeBoughtBack(boughtBack).then((up) => {
      if (up) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, [isFocused, boughtBack]);

  // Something that comes before the two steps: new tasks to rate, or a finished round.
  const move = summary ? todaysMove({ schedule, handoffs, summary }) : null;
  const first = move && (move.stage === 'audit' || move.action === 'nextRound') ? move : null;

  const doMove = async () => {
    if (!first) return;
    if (first.action !== 'nextRound') {
      navigation.navigate(...first.go);
      return;
    }
    setStartingRound(true);
    try {
      const res = await api.startNextRound();
      replaceOnboarding(res.onboarding);
      await refreshHandoffs();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.navigate(...first.go);
    } catch (err) {
      Alert.alert("Couldn't start the next round", err.message);
    } finally {
      setStartingRound(false);
    }
  };

  // Once there's real progress to lose, invite guests to save it (never before: no sign-up wall).
  const askToSave = user?.isGuest && (summary?.done || 0) > 0;
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : '';
  const openHandoff = (activity) => navigation.navigate('HandoffDetail', { activity });
  // "Have you delegated it?" Yes: handed off, its hours move to Reinvest. Undo puts it back.
  const setDelegated = (activity, yes) =>
    update(activity, { status: yes ? 'done' : 'mine' }).catch((err) => Alert.alert("Couldn't save that", err.message));

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.hello} numberOfLines={1}>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <ThemeToggle />
      </View>

      <Animated.View entering={FadeIn.duration(300)}>
        {/* First, if something comes before the steps. */}
        {first ? (
          <Card style={styles.first}>
            <Text style={styles.firstTitle}>{first.title}</Text>
            <Text style={styles.firstBody}>{first.body}</Text>
            <Button title={first.cta} icon="arrow-forward" onPress={doMove} loading={startingRound} style={styles.firstButton} />
          </Card>
        ) : null}

        {/* First, your routine at a glance: where your day goes, quadrant by quadrant. */}
        <RoutineStats items={routineNow} onOpen={() => navigation.navigate('MyDay')} />

        {/* Then the journey's last two steps. */}
        <DelegationCard
          handoffs={handoffs}
          reminders={reminders}
          onDelegated={(activity) => setDelegated(activity, true)}
          onRemind={(activity, when) => setReminder(activity, when).then(setReminders)}
          onPlan={openHandoff}
          style={styles.block}
        />
        <ReinvestCard
          handoffs={handoffs}
          summary={summary}
          fills={fills}
          onUndo={(activity) => setDelegated(activity, false)}
          onFill={() => navigation.navigate('Fill')}
          style={styles.block}
        />

        {/* Your progress: hours bought back, with rings for delegated and reinvested. */}
        <Text style={[styles.sectionTitle, styles.block]}>Your progress</Text>
        <HoursBackCard summary={summary} onPress={() => navigation.navigate('Handoffs')} />

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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm, marginBottom: spacing.lg },
  hello: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  first: { marginBottom: spacing.lg, borderWidth: 1.5, borderColor: colors.primary, borderRadius: radius.lg },
  firstTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  firstBody: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  firstButton: { marginTop: spacing.md },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2, marginBottom: spacing.sm },
  block: { marginTop: spacing.xl },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.lg },
  saveText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
