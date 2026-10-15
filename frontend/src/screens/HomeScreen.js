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
import { DelegationCard, ReinvestCard } from '../components/JourneyStepCards';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack } from '../storage/progress';
import { greeting, todaysMove } from '../constants/home';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * Home, where the journey continues after onboarding, on the journey's sunrise: your progress first
 * (hours back; delegated and reinvested), then the last two steps as cards: Step 3 · Delegation, one
 * question per draining task ("Have you delegated it?"), and Step 4 · Reinvest, where every yes lands
 * with the hours it freed, ready for a new job. When something else comes first (new tasks to
 * rate, or a finished round), it shows on top with one button.
 */
export default function HomeScreen({ navigation }) {
  const { user, onboarding, replaceOnboarding } = useOnboarding();
  const { handoffs, fills, summary, refresh: refreshHandoffs, update } = useHandoffs();
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
    <Screen edges={['top']} tinted="dawn">
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

        {/* The one number: hours bought back a week. */}
        <HoursBackCard summary={summary} onPress={() => navigation.navigate('Handoffs')} />

        {/* The journey's last two steps. */}
        <DelegationCard
          handoffs={handoffs}
          onDelegated={(activity) => setDelegated(activity, true)}
          onPlan={openHandoff}
          onSeeAll={() => navigation.navigate('Handoffs')}
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
  block: { marginTop: spacing.lg },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.lg },
  saveText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
