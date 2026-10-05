import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, RefreshControl, Text, View } from 'react-native';
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Logo from '../components/Logo';
import DripMatrix from '../components/DripMatrix';
import ThemeToggle from '../components/ThemeToggle';
import BuybackRingCard from '../components/BuybackRingCard';
import LoopTracker from '../components/LoopTracker';
import TodaysMoveCard from '../components/TodaysMoveCard';
import { Card } from '../components/Card';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { loadStreak, noticeBoughtBack } from '../storage/progress';
import { DRIP, calculateBuybackRate, summarizeSchedule } from '../constants/content';
import { greeting, ideaOfTheDay, loopStatus, todaysMove } from '../constants/home';
import { dayNow, energyShare, scheduleNow } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// Home tab, built around one goal: buying back the hours that drain you.
// A personal greeting, your DRIP Matrix, then progress (ring + Buyback Loop), your next move and a daily idea.
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
  const [refreshing, setRefreshing] = useState(false);

  const schedule = onboarding?.schedule || [];
  const currency = onboarding?.currency || 'USD';
  // The matrix shows the day as it is now: handed-off tasks out, filled time in.
  const drip = summarizeSchedule(scheduleNow(dayNow(schedule, handoffs, fills)), onboarding?.buybackRate);
  const { effectiveHourlyRate } = calculateBuybackRate(onboarding?.annualIncome || 0);
  const zone = drip.dominant ? DRIP[drip.dominant] : null; // where most of your day goes

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

      <Appear index={1}>
        <Pressable
          onPress={() => navigation.navigate('MyDay')}
          accessibilityRole="button"
          accessibilityLabel={`Your DRIP Matrix${zone ? `. You live in ${zone.name}` : ''}. Open My day`}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Card style={styles.dripCard}>
            {/* Your zone's pastel at the top, fading to the card so the four squares stay easy to tell apart. */}
            <LinearGradient
              colors={[zone ? colors[zone.soft] : colors.surfaceAlt, colors.surface]}
              locations={[0, 0.55]}
              style={styles.dripTint}
            >
              <View style={styles.cardHead}>
                <Text style={type.label}>Your DRIP Matrix</Text>
                <View style={styles.link}>
                  <Text style={styles.linkText}>My day</Text>
                  <Ionicons name="chevron-forward" size={14} color={colors.primary} />
                </View>
              </View>
              {zone ? (
                <View style={styles.zone}>
                  <View style={[styles.zonePill, { backgroundColor: colors.surface }]}>
                    <View style={[styles.zoneDot, { backgroundColor: colors[zone.color] }]} />
                    <Text style={[styles.zonePillText, { color: colors[zone.color] }]}>{zone.axes}</Text>
                  </View>
                  <Text style={styles.zoneTitle}>
                    You live in <Text style={{ color: colors[zone.color] }}>{zone.name}</Text>
                  </Text>
                  <Text style={styles.zoneAdvice}>{zone.advice}</Text>
                </View>
              ) : null}
              <DripMatrix summary={drip} compact />
            </LinearGradient>
          </Card>
        </Pressable>
      </Appear>

      <Appear index={2}>
        <Text style={styles.section}>Your progress</Text>
        {handoffSummary ? (
          <BuybackRingCard
            summary={handoffSummary}
            share={energyShare(schedule, handoffSummary)}
            effectiveHourlyRate={effectiveHourlyRate}
            buybackRate={onboarding?.buybackRate}
            currency={currency}
            streak={streak}
            celebrate={celebrate}
            onPress={() => navigation.navigate('Handoffs')}
          />
        ) : (
          <Placeholder height={380} />
        )}
        <LoopTracker status={loop} round={handoffSummary?.round} style={styles.gap} />
      </Appear>

      <Appear index={3}>
        <Text style={styles.section}>Your next move</Text>
        {move ? <TodaysMoveCard move={move} onPress={doMove} loading={startingRound} /> : <Placeholder height={190} />}

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

      <Appear index={4}>
        <View style={styles.idea}>
          <View style={styles.ideaIcon}>
            <Ionicons name="bulb" size={18} color={colors.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.ideaLabel}>Buyback idea of the day</Text>
            <Text style={styles.ideaText}>{ideaOfTheDay()}</Text>
          </View>
        </View>
      </Appear>
    </Screen>
  );
}

/** Sections fade up one after another when Home first opens. */
function Appear({ index, style, children }) {
  return (
    <Animated.View entering={FadeInDown.duration(420).delay(index * 70)} style={style}>
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
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  dripCard: { padding: 0 },
  dripTint: { borderRadius: radius.lg, padding: spacing.md + 4 },
  zone: { marginBottom: spacing.md },
  zonePill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: spacing.sm,
    borderRadius: radius.pill,
  },
  zoneDot: { width: 8, height: 8, borderRadius: 4 },
  zonePillText: { fontSize: 12, fontWeight: '700' },
  zoneTitle: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  zoneAdvice: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  section: { fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginTop: spacing.xl, marginBottom: spacing.md },
  gap: { marginTop: spacing.md },
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
  idea: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
    padding: spacing.md + 4,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
  },
  ideaIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accentSoft },
  ideaLabel: { fontSize: 12, fontWeight: '700', color: colors.primaryDark, textTransform: 'uppercase', letterSpacing: 1 },
  ideaText: { fontSize: 16, lineHeight: 24, fontWeight: '600', color: colors.text, marginTop: 6 },
});
