import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import TimeTree from '../components/TimeTree';
import HandoffStepsRow from '../components/HandoffStepsRow';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack } from '../storage/progress';
import { WORKDAYS_PER_WEEK, greeting, todaysMove } from '../constants/home';
import { handoffSteps } from '../constants/handoffSteps';
import { unfilledHours } from '../constants/fill';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * Home as a tree, no cards: your time is a tree on the hill, and each task that drains you is a dry
 * leaf around it. Tap a leaf to hand it off; every handoff makes the tree grow greener, and filling
 * the freed time makes it blossom. Under it, one sentence and one button: the next simple step. It
 * picks up where the journey ended, on the same sunrise: "Your time back, for the work and life you love".
 */
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, summary, refresh: refreshHandoffs } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const isFocused = useIsFocused();
  const [startingRound, setStartingRound] = useState(false);

  const schedule = onboarding?.schedule || [];

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
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

  // The dry leaves: every draining task not handed off yet.
  const leaves = handoffs.filter((h) => h.status !== 'done');
  const drainWeek = leaves.reduce((t, h) => t + h.hours, 0) * WORKDAYS_PER_WEEK;
  const draining = summary?.drainingHours || 0;
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const progress = summary ? (draining ? bought / draining : 1) : 0;
  const backWeek = bought * WORKDAYS_PER_WEEK;
  // Blossoms: how much of the freed time has a new job (Fill).
  const bloom = bought ? Math.min(1, (summary?.filledHours || 0) / bought) : 0;

  const move = summary ? todaysMove({ schedule, handoffs, summary }) : null;

  // Handing off: tasks with at least one step done (kept-for-later ones wait), most advanced first.
  const doneSteps = (h) => handoffSteps(h).filter((s) => s.done).length;
  const started = leaves.filter((h) => h.status !== 'later' && doneSteps(h) > 0).sort((a, b) => doneSteps(b) - doneSteps(a));
  const SHOW_STARTED = 2;
  // Freed hours (a day) still waiting for a new job.
  const free = unfilledHours(summary);
  // The single next step, when there's no handoff row to continue (or it's something else: rate new
  // tasks, or start the next round).
  const showMove =
    move && (move.stage === 'audit' || move.action === 'nextRound' || (!started.length && move.stage === 'transfer'));

  // Round complete: close it, then re-audit the routine (edit it, then rate everything again).
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

  // One sentence for the sky.
  const n = leaves.length;
  const headline = !summary
    ? ' '
    : n
    ? `${n} ${n === 1 ? 'task drains' : 'tasks drain'} ${formatHours(drainWeek)} of your week`
    : draining
    ? `Your tree is thriving. ${formatHours(backWeek)} a week is yours again`
    : 'Your tree is thriving. Your time is yours';
  const subline = !summary
    ? null
    : !n
    ? 'For the work and life you love'
    : started.length
    ? null
    : 'Tap a dry leaf to hand it off and help your tree grow';

  return (
    <Screen tinted="dawn" scroll={false} edges={['top']} contentStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.hello} numberOfLines={1}>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <ThemeToggle />
      </View>

      {/* Your time as a tree; what drains you as dry leaves around it. */}
      <TimeTree
        tasks={leaves}
        progress={progress}
        bloom={bloom}
        onLeaf={(activity) => navigation.navigate('HandoffDetail', { activity })}
      />

      {/* One sentence and one button: the next simple step. */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.bottom}>
        <Text style={styles.headline}>{headline}</Text>
        {subline ? <Text style={styles.subline}>{subline}</Text> : null}

        {/* Handing off: where each started task is, one tap to continue. */}
        {started.length ? (
          <View style={styles.block}>
            <Text style={styles.label}>Handing off</Text>
            {started.slice(0, SHOW_STARTED).map((h, i) => (
              <HandoffStepsRow
                key={h.activity}
                handoff={h}
                onOpen={() => navigation.navigate('HandoffDetail', { activity: h.activity })}
                style={i > 0 && styles.rowLine}
              />
            ))}
            {started.length > SHOW_STARTED ? (
              <Pressable onPress={() => navigation.navigate('Handoffs')} hitSlop={8} style={styles.link} accessibilityRole="button">
                <Text style={styles.linkText}>+{started.length - SHOW_STARTED} more in progress</Text>
                <Ionicons name="chevron-forward" size={14} color={colors.primary} />
              </Pressable>
            ) : null}
          </View>
        ) : null}

        {/* Nothing started yet (or something else comes first): the one next step. */}
        {showMove ? (
          <>
            <Text style={styles.next} numberOfLines={2}>
              Next: {move.title}
            </Text>
            <Button title={move.cta} icon="arrow-forward" onPress={doMove} loading={startingRound} />
          </>
        ) : null}

        {/* The hours you bought back, waiting for a new job (Fill). */}
        {free >= 0.25 ? (
          <Pressable
            onPress={() => navigation.navigate('Fill')}
            accessibilityRole="button"
            style={({ pressed }) => [styles.fill, pressed && { opacity: 0.8 }]}
          >
            <Ionicons name="sunny" size={18} color={colors.accentText} />
            <Text style={styles.fillText}>
              <Text style={styles.fillStrong}>{formatHours(free)} a day is free.</Text> Give it a new job
            </Text>
            <View style={styles.fillAction}>
              <Text style={styles.fillActionText}>Fill</Text>
            </View>
          </Pressable>
        ) : bought > 0 ? (
          <View style={styles.filled}>
            <Ionicons name="flower" size={14} color={colors.accentText} />
            <Text style={styles.filledText}>{formatHours(backWeek)} a week back, and every hour has a new job</Text>
          </View>
        ) : null}

        {/* More drains than labelled leaves: the rest are fallen leaves; this opens the full list. */}
        {n > 5 ? (
          <Pressable onPress={() => navigation.navigate('Handoffs')} hitSlop={8} style={styles.link} accessibilityRole="button">
            <Text style={styles.linkText}>See all {n} tasks</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
        {askToSave ? (
          <Pressable onPress={() => navigation.navigate('Account', { mode: 'save' })} hitSlop={8} style={styles.link} accessibilityRole="button">
            <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
            <Text style={styles.linkText}>Save your progress</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  page: { paddingBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  hello: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  // The ground under the sky: the hill's colour runs on to the bottom, so the next step stands on it.
  bottom: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md, backgroundColor: colors.hill },
  headline: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  subline: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.accentText, textAlign: 'center', marginTop: 4 },
  next: { fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  block: { marginTop: spacing.sm },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  rowLine: { borderTopWidth: 1, borderTopColor: colors.goldLine },
  fill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm + 2,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
  },
  fillText: { flex: 1, fontSize: 13, lineHeight: 18, color: colors.text },
  fillStrong: { fontWeight: '800', color: colors.accentText },
  fillAction: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface },
  fillActionText: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  filled: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  filledText: { fontSize: 13, fontWeight: '700', color: colors.accentText },
  link: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
