import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useFocusEffect, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Button from '../components/Button';
import ThemeToggle from '../components/ThemeToggle';
import Sky from '../components/Sky';
import { api } from '../api/client';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { noticeBoughtBack } from '../storage/progress';
import { WORKDAYS_PER_WEEK, greeting, todaysMove } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

/**
 * Home as a sky, no cards: your time is the sun, and each task that drains you is a cloud in front
 * of it. Tap a cloud to hand it off; every handoff clears a cloud and lifts the sun. Under the sky,
 * one sentence and one button: the next simple step. It picks up where the journey ended, on the
 * same sunrise: "Your time back, for the work and life you love".
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

  // The clouds: every draining task not handed off yet.
  const clouds = handoffs.filter((h) => h.status !== 'done');
  const cloudWeek = clouds.reduce((t, h) => t + h.hours, 0) * WORKDAYS_PER_WEEK;
  const draining = summary?.drainingHours || 0;
  const bought = Math.min(summary?.boughtBackHours || 0, draining);
  const progress = summary ? (draining ? bought / draining : 1) : 0;
  const backWeek = bought * WORKDAYS_PER_WEEK;

  const move = summary ? todaysMove({ schedule, handoffs, summary }) : null;

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
  const n = clouds.length;
  const headline = !summary
    ? ' '
    : n
    ? `${n} ${n === 1 ? 'cloud hides' : 'clouds hide'} ${formatHours(cloudWeek)} of your week`
    : draining
    ? `Clear sky. ${formatHours(backWeek)} a week is yours again`
    : 'Clear sky. Your time is yours';
  const subline = !summary
    ? ' '
    : backWeek
    ? `${formatHours(backWeek)} a week back so far, for the work and life you love`
    : n
    ? 'Tap a cloud to hand it off and let your sun rise'
    : 'For the work and life you love';

  return (
    <Screen tinted="dawn" scroll={false} edges={['top']} contentStyle={styles.page}>
      <View style={styles.header}>
        <Text style={styles.hello} numberOfLines={1}>
          {greeting()}
          {firstName ? `, ${firstName}` : ''}
        </Text>
        <ThemeToggle />
      </View>

      {/* Your time as the sun; what drains you as clouds in front of it. */}
      <Sky tasks={clouds} progress={progress} onCloud={(activity) => navigation.navigate('HandoffDetail', { activity })} />

      {/* One sentence and one button: the next simple step. */}
      <Animated.View entering={FadeIn.duration(300)} style={styles.bottom}>
        <Text style={styles.headline}>{headline}</Text>
        <Text style={styles.subline}>{subline}</Text>
        {move ? (
          <>
            <Text style={styles.next} numberOfLines={2}>
              Next: {move.title}
            </Text>
            <Button title={move.cta} icon="arrow-forward" onPress={doMove} loading={startingRound} />
          </>
        ) : null}
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
  page: { paddingBottom: 0 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: spacing.sm },
  hello: { flex: 1, fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.5 },
  // The ground under the sky: the hill's colour runs on to the bottom, so the next step stands on it.
  bottom: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, paddingTop: spacing.xs, paddingBottom: spacing.md, backgroundColor: colors.hill },
  headline: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.text, textAlign: 'center', letterSpacing: -0.3 },
  subline: { fontSize: 14, lineHeight: 20, fontWeight: '600', color: colors.accentText, textAlign: 'center', marginTop: 4 },
  next: { fontSize: 13, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: spacing.md, marginBottom: spacing.sm },
  save: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: spacing.sm },
  saveText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
