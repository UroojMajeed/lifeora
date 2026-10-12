import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import ThemeToggle from '../components/ThemeToggle';
import TimeBackCard from '../components/TimeBackCard';
import TodaysMoveCard from '../components/TodaysMoveCard';
import LoopPills from '../components/LoopPills';
import DrainList from '../components/DrainList';
import DripRow from '../components/DripRow';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { loadStreak, noticeBoughtBack } from '../storage/progress';
import { summarizeSchedule } from '../constants/content';
import { WORKDAYS_PER_WEEK, greeting, ideaOfTheDay, loopStatus, todaysMove } from '../constants/home';
import { dayNow, scheduleNow } from '../constants/fill';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * Home, built around one goal: buying back the hours that drain you. It continues the journey from
 * onboarding: first the one number (time back), then the one thing to do next, the Buyback Loop as
 * the same pills, the tasks still draining you (one tap each), and the DRIP Matrix folded into a row.
 */
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, summary: handoffSummary, refresh: refreshHandoffs } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const isFocused = useIsFocused();
  const [streak, setStreak] = useState(null);
  const [startingRound, setStartingRound] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const schedule = onboarding?.schedule || [];
  const currency = onboarding?.currency || 'USD';
  // The routine as it is now: handed-off tasks out, filled time in.
  const now = scheduleNow(dayNow(schedule, handoffs, fills));
  const drip = summarizeSchedule(now, onboarding?.buybackRate);

  // Fresh numbers every time Home comes back into view (e.g. after handing something off).
  useFocusEffect(
    useCallback(() => {
      refreshHandoffs();
      loadStreak().then(setStreak);
    }, [refreshHandoffs])
  );

  // More hours bought back since Home last showed them: a small success buzz (only while on screen).
  const boughtBack = handoffSummary?.boughtBackHours;
  useEffect(() => {
    if (!isFocused || boughtBack === undefined) return;
    noticeBoughtBack(boughtBack).then((up) => {
      if (up) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    });
  }, [isFocused, boughtBack]);

  const move = handoffSummary ? todaysMove({ schedule, handoffs, summary: handoffSummary }) : null;
  // The handoff the next move is about (if any): its hours and what to pay for it.
  const moveTask = move?.go?.[0] === 'HandoffDetail' ? handoffs.find((h) => h.activity === move.go[1]?.activity) : null;
  let moveNote = null;
  if (moveTask) {
    const week = formatHours(moveTask.hours * WORKDAYS_PER_WEEK);
    moveNote =
      moveTask.method === 'drop'
        ? `Frees ${week} a week · costs nothing`
        : `Frees ${week} a week · pay up to ${formatMoney(onboarding?.buybackRate || 0, currency)}/hr`;
  }

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

  const loop = loopStatus({ schedule, summary: handoffSummary });
  // Once there's real progress to lose, invite guests to save it (never before: no sign-up wall).
  const askToSave = user?.isGuest && (handoffSummary?.done || 0) > 0;
  const firstName = user?.name ? user.name.trim().split(/\s+/)[0] : '';
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([refreshHandoffs(), loadStreak().then(setStreak)]);
    setRefreshing(false);
  };

  return (
    <Screen
      edges={[]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressViewOffset={insets.top}
        />
      }
    >
      <Appear index={0} style={[styles.header, { marginTop: insets.top + spacing.md }]}>
        <Logo size={40} />
        <View style={styles.headerText}>
          <Text style={styles.date}>{today}</Text>
          <Text style={styles.hello} numberOfLines={1} adjustsFontSizeToFit>
            {greeting()}
            {firstName ? `, ${firstName}` : ''}
          </Text>
        </View>
        <ThemeToggle />
      </Appear>

      {/* 1) The one number: time back. */}
      <Appear index={1}>
        {handoffSummary ? (
          <TimeBackCard summary={handoffSummary} streak={streak} onPress={() => navigation.navigate('Handoffs')} />
        ) : (
          <Placeholder height={150} />
        )}
      </Appear>

      {/* 2) The one thing to do next. */}
      <Appear index={2}>
        <Text style={styles.section}>Your next move</Text>
        {move ? <TodaysMoveCard move={move} note={moveNote} onPress={doMove} loading={startingRound} /> : <Placeholder height={200} />}

        {askToSave ? (
          <Pressable
            onPress={() => navigation.navigate('Account', { mode: 'save' })}
            accessibilityRole="button"
            style={({ pressed }) => [styles.save, pressed && styles.pressed]}
          >
            <View style={styles.saveIcon}>
              <Ionicons name="cloud-upload-outline" size={20} color={colors.primaryDark} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.saveTitle}>Save your progress</Text>
              <Text style={styles.saveText}>Keep your handoffs safe if you change phones. Takes 10 seconds.</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        ) : null}
      </Appear>

      {/* 3) Where you are in the Loop, and what still drains you. */}
      <Appear index={3}>
        <LoopPills status={loop} round={handoffSummary?.round || 1} style={styles.block} />
        <DrainList
          handoffs={handoffs}
          skip={moveTask?.activity}
          onOpen={(activity) => navigation.navigate('HandoffDetail', { activity })}
          onSeeAll={() => navigation.navigate('Handoffs')}
          style={styles.block}
        />
      </Appear>

      {/* 4) The matrix (folded) and a small idea for the day. */}
      <Appear index={4}>
        <DripRow items={now} summary={drip} style={styles.block} />
        <View style={styles.idea}>
          <Ionicons name="bulb" size={16} color={colors.accent} style={styles.ideaIcon} />
          <Text style={styles.ideaText}>{ideaOfTheDay()}</Text>
        </View>
      </Appear>
    </Screen>
  );
}

/** Sections fade in one after another when Home first opens (one quiet fade, no movement). */
function Appear({ index, style, children }) {
  return (
    <Animated.View entering={FadeIn.duration(300).delay(index * 60)} style={style}>
      {children}
    </Animated.View>
  );
}

/** A soft pulsing block while numbers load, so the layout doesn't jump. */
function Placeholder({ height }) {
  const { colors } = useTheme();
  const pulse = useSharedValue(0.5);
  useEffect(() => {
    pulse.value = withRepeat(withTiming(1, { duration: 800 }), -1, true);
  }, [pulse]);
  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));
  return <Animated.View style={[{ height, borderRadius: radius.lg, backgroundColor: colors.surfaceAlt }, style]} />;
}

const makeStyles = (colors) => ({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.lg },
  headerText: { flex: 1 },
  date: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  hello: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginTop: 2 },
  pressed: { opacity: 0.92, transform: [{ scale: 0.99 }] },
  section: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1, marginTop: spacing.lg, marginBottom: spacing.sm },
  block: { marginTop: spacing.lg },
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
  saveIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  saveTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
  saveText: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  // The idea of the day: small and quiet, at the very end.
  idea: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg, paddingHorizontal: spacing.xs },
  ideaIcon: { marginTop: 2 },
  ideaText: { flex: 1, fontSize: 13, lineHeight: 19, fontWeight: '600', color: colors.muted },
});
