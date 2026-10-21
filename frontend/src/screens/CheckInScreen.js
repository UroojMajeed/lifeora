import { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { useHandoffs } from '../context/HandoffsContext';
import { FEELINGS, checkInQuestions, checkInStreak, weekKey } from '../constants/checkin';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;

const HANDOFF_ANSWERS = [
  { answer: 'kept', icon: 'checkmark', title: 'Yes, still handed off', sub: 'It stayed off my plate', tone: 'success' },
  { answer: 'slipped', icon: 'refresh', title: 'It slipped back', sub: "I'm doing it myself again", tone: 'error' },
];
const FILL_ANSWERS = [
  { answer: 'yes', icon: 'checkmark', title: 'Yes', sub: 'I used the hours for it', tone: 'success' },
  { answer: 'partly', icon: 'remove', title: 'Partly', sub: 'Some of them', tone: 'accent' },
  { answer: 'no', icon: 'close', title: 'Not this week', sub: 'Other things took the time', tone: 'muted' },
];

/**
 * The weekly check-in, one question per screen: each handed-off task (still off your plate?), each
 * reinvestment (did you use the hours?), then how the week felt. Answering moves on by itself; the
 * last answer saves, then a short summary (hours confirmed, streak, anything that slipped back).
 */
export default function CheckInScreen({ navigation }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { handoffs, fills, checkIns = [], saveCheckIn } = useHandoffs();

  // The questions are fixed when the check-in opens (answers change the handoffs underneath).
  const steps = useMemo(() => {
    const q = checkInQuestions({ handoffs, fills });
    return [
      ...q.handoffs.map((x) => ({ kind: 'handoff', activity: x.activity, hours: x.hours })),
      ...q.fills.map((x) => ({ kind: 'fill', activity: x.activity, hours: x.hours })),
      { kind: 'feeling' },
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { [step index]: answer }
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null); // the saved check-in, for the summary

  const step = steps[index];
  const answer = (value) => {
    Haptics.selectionAsync().catch(() => {});
    const next = { ...answers, [index]: value };
    setAnswers(next);
    if (index < steps.length - 1) setIndex(index + 1);
    else save(next);
  };

  const save = async (all) => {
    const payload = { week: weekKey(), handoffs: [], fills: [], feeling: null };
    steps.forEach((s, i) => {
      if (s.kind === 'handoff') payload.handoffs.push({ activity: s.activity, answer: all[i] });
      if (s.kind === 'fill') payload.fills.push({ activity: s.activity, answer: all[i] });
      if (s.kind === 'feeling') payload.feeling = all[i];
    });
    setSaving(true);
    try {
      const res = await saveCheckIn(payload);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setResult({
        entry: (res.checkIns || []).find((c) => c.week === payload.week),
        streak: checkInStreak(res.checkIns || []),
        slipped: payload.handoffs.filter((a) => a.answer === 'slipped').map((a) => a.activity),
      });
    } catch (err) {
      Alert.alert("Couldn't save your check-in", err.message);
    } finally {
      setSaving(false);
    }
  };

  const close = () => navigation.goBack();
  const toneColor = (tone) =>
    ({ success: colors.chart.production, error: colors.error, accent: colors.accentText, muted: colors.muted })[tone];
  const toneSoft = (tone) =>
    ({ success: colors.successSoft, error: colors.errorSoft, accent: colors.accentSoft, muted: colors.surfaceAlt })[tone];

  // ---- The summary, once saved.
  if (result) {
    const hours = result.entry?.confirmedHours || 0;
    return (
      <Screen footer={<Button title="Back to Home" icon="home" onPress={() => navigation.navigate('Main', { screen: 'Home' })} />}>
        <View style={styles.summary}>
          <Animated.View entering={ZoomIn.duration(350)} style={styles.doneIcon}>
            <Ionicons name="checkmark" size={40} color={colors.heroFrom} />
          </Animated.View>
          <Text style={styles.summaryTitle}>Week checked in</Text>
          <View style={styles.stats}>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{h(hours)}</Text>
              <Text style={styles.statLabel}>bought back this week</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{result.streak} 🔥</Text>
              <Text style={styles.statLabel}>{result.streak === 1 ? 'week' : 'weeks in a row'}</Text>
            </View>
          </View>
          {result.slipped.length ? (
            <View style={styles.slipped}>
              <Ionicons name="refresh" size={16} color={colors.accentText} />
              <Text style={styles.slippedText}>
                {result.slipped.join(', ')} {result.slipped.length === 1 ? 'is' : 'are'} back in your next moves. Hand {result.slipped.length === 1 ? 'it' : 'them'} off again when you can.
              </Text>
            </View>
          ) : null}
        </View>
      </Screen>
    );
  }

  // ---- One question at a time.
  return (
    <Screen>
      <View style={styles.top}>
        <Pressable
          onPress={index ? () => setIndex(index - 1) : close}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={index ? 'Previous question' : 'Close'}
          style={styles.iconBtn}
        >
          <Ionicons name={index ? 'arrow-back' : 'close'} size={20} color={colors.text} />
        </Pressable>
        <View style={styles.progress}>
          {steps.map((s, i) => (
            <View key={i} style={[styles.seg, i <= index && styles.segOn]} />
          ))}
        </View>
        <Text style={styles.count}>
          {index + 1}/{steps.length}
        </Text>
      </View>

      <Animated.View key={index} entering={FadeInRight.duration(250)} style={styles.question}>
        {step.kind === 'handoff' ? (
          <>
            <Text style={styles.kicker}>Your handoffs</Text>
            <Text style={styles.title}>{step.activity}: still off your plate?</Text>
            <Text style={styles.sub}>You handed it off. {h(step.hours)} a day, if it stuck.</Text>
          </>
        ) : step.kind === 'fill' ? (
          <>
            <Text style={styles.kicker}>Your reinvested time</Text>
            <Text style={styles.title}>Did you use your {h(step.hours)} a day for {step.activity.toLowerCase()}?</Text>
          </>
        ) : (
          <>
            <Text style={styles.kicker}>Last one</Text>
            <Text style={styles.title}>How did this week feel?</Text>
          </>
        )}

        {step.kind === 'feeling' ? (
          <View style={styles.feelings}>
            {FEELINGS.map((f) => (
              <Pressable
                key={f.value}
                onPress={() => answer(f.value)}
                disabled={saving}
                accessibilityRole="button"
                accessibilityLabel={f.label}
                style={({ pressed }) => [styles.feeling, answers[index] === f.value && styles.feelingOn, pressed && styles.pressed]}
              >
                <Text style={styles.emoji}>{f.emoji}</Text>
                <Text style={styles.feelingLabel}>{f.label}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={styles.answers}>
            {(step.kind === 'handoff' ? HANDOFF_ANSWERS : FILL_ANSWERS).map((a) => {
              const on = answers[index] === a.answer;
              return (
                <Pressable
                  key={a.answer}
                  onPress={() => answer(a.answer)}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.option, on && { borderColor: toneColor(a.tone) }, pressed && styles.pressed]}
                >
                  <View style={[styles.optionIcon, { backgroundColor: toneSoft(a.tone) }]}>
                    <Ionicons name={a.icon} size={18} color={toneColor(a.tone)} />
                  </View>
                  <View style={styles.optionMain}>
                    <Text style={styles.optionTitle}>{a.title}</Text>
                    <Text style={styles.optionSub}>{a.sub}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
        {saving ? (
          <Animated.Text entering={FadeIn} style={styles.saving}>
            Saving…
          </Animated.Text>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingTop: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  segOn: { backgroundColor: colors.primary },
  count: { fontSize: 13, fontWeight: '700', color: colors.muted },
  question: { marginTop: spacing.xl },
  kicker: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.8, textTransform: 'uppercase' },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: spacing.sm },
  sub: { fontSize: 15, lineHeight: 21, color: colors.muted, marginTop: spacing.sm },
  answers: { gap: spacing.sm + 2, marginTop: spacing.xl },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  optionIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  optionMain: { flex: 1, minWidth: 0 },
  optionTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  optionSub: { fontSize: 13, color: colors.muted, marginTop: 1 },
  pressed: { opacity: 0.8, transform: [{ scale: 0.98 }] },
  feelings: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xl },
  feeling: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  feelingOn: { borderColor: colors.primary },
  emoji: { fontSize: 32 },
  feelingLabel: { fontSize: 13, fontWeight: '700', color: colors.text },
  saving: { textAlign: 'center', fontSize: 13, color: colors.muted, marginTop: spacing.lg },
  // Summary
  summary: { alignItems: 'center', paddingTop: spacing.xxl },
  doneIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft },
  summaryTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginTop: spacing.md },
  stats: { flexDirection: 'row', gap: spacing.sm + 4, alignSelf: 'stretch', marginTop: spacing.xl },
  stat: { flex: 1, alignItems: 'center', padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  statValue: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  statLabel: { fontSize: 13, color: colors.muted, marginTop: 2, textAlign: 'center' },
  slipped: { flexDirection: 'row', gap: spacing.sm, alignSelf: 'stretch', marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  slippedText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
});
