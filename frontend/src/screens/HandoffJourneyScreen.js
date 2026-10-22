import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import { useHandoffs } from '../context/HandoffsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { HANDOFF_METHODS, handoffIdeas } from '../constants/content';
import { formatDay, sameDay, startOptions } from '../constants/handoffSteps';
import { DONE_DRAFT, TOOL_IDEAS, handoverDraft, jobPostDraft, journeyOf, stepSummary } from '../constants/journey';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;
const methodLabel = (key) => HANDOFF_METHODS.find((m) => m.key === key)?.label || '';

/**
 * Handing off one task, as a journey: a road of stations (Choose how → Define done → Find who →
 * Hand it over) ending at the sun. Finished stations show what you chose; the current one glows and
 * opens its step in a bottom sheet; later ones wait. Each step saves when it's done, so you can leave
 * and pick up here (or from the card on Home) where you left off. Handing it over counts as delegated
 * (like "Yes" on Home's move card): its hours are bought back, and the weekly check-in asks if it
 * stuck. Route param: `activity`.
 */
export default function HandoffJourneyScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { handoffs } = useHandoffs();
  const task = handoffs.find((x) => x.activity === route.params?.activity);
  const [sheet, setSheet] = useState({ open: false, key: null, id: 0 });

  if (!task) {
    return (
      <Screen>
        <PageHeader eyebrow="Hand it off" title="Nothing to hand off" />
      </Screen>
    );
  }

  const { steps, current, doneCount, finished } = journeyOf(task);
  const open = (key) => {
    Haptics.selectionAsync().catch(() => {});
    setSheet((s) => ({ open: true, key, id: s.id + 1 }));
  };

  return (
    <Screen>
      <PageHeader eyebrow="Hand it off" title={task.activity} subtitle={`${h(task.hours)} a day · ${doneCount} of ${steps.length} steps done`} />

      {/* The road: one station per step, then the sun. */}
      <View style={styles.road}>
        {steps.map((s, i) => {
          const isCurrent = current?.key === s.key;
          const locked = !s.done && !isCurrent;
          return (
            <View key={s.key} style={styles.stop}>
              <View style={styles.rail}>
                <View style={[styles.node, s.done && styles.nodeDone, isCurrent && styles.nodeNow]}>
                  {s.done ? (
                    <Ionicons name="checkmark" size={16} color={colors.onColor} />
                  ) : (
                    <Text style={[styles.nodeNum, isCurrent && styles.nodeNumNow]}>{i + 1}</Text>
                  )}
                </View>
                <View style={[styles.line, s.done && styles.lineDone]} />
              </View>
              <Pressable
                onPress={() => open(s.key)}
                disabled={locked}
                accessibilityRole="button"
                accessibilityLabel={`Step ${i + 1}, ${s.title}${s.done ? ', done' : isCurrent ? ', next' : ', later'}`}
                style={({ pressed }) => [styles.station, isCurrent && styles.stationNow, locked && styles.stationLocked, pressed && styles.pressed]}
              >
                <View style={styles.stationHead}>
                  <Ionicons name={s.icon} size={17} color={isCurrent ? colors.accentText : s.done ? colors.primary : colors.muted} />
                  <Text style={[styles.stationTitle, locked && styles.mutedText]}>{s.title}</Text>
                  {s.done ? <Ionicons name="create-outline" size={15} color={colors.muted} /> : null}
                </View>
                {s.done ? (
                  <Text style={styles.summary} numberOfLines={2}>
                    {stepSummary(s.key, task, methodLabel(task.method))}
                  </Text>
                ) : isCurrent ? (
                  <View style={styles.go}>
                    <Text style={styles.goText}>{doneCount ? 'Continue' : 'Start'}</Text>
                    <Ionicons name="arrow-forward" size={15} color={brand.evergreen} />
                  </View>
                ) : null}
              </Pressable>
            </View>
          );
        })}

        {/* The destination. */}
        <View style={styles.stop}>
          <View style={styles.rail}>
            <View style={[styles.sun, finished && styles.sunOn]}>
              <Ionicons name="sunny" size={22} color={finished ? '#FFFFFF' : colors.muted} />
            </View>
          </View>
          <View style={styles.dest}>
            <Text style={[styles.destTitle, !finished && styles.mutedText]}>{finished ? 'Off your plate!' : 'Off your plate'}</Text>
            <Text style={styles.destLine}>+{h(task.hours * 5)} a week back</Text>
          </View>
        </View>
      </View>

      {finished ? (
        <Animated.View entering={ZoomIn.duration(350)} style={styles.win}>
          <Text style={styles.winTitle}>Done! {h(task.hours * 5)} a week is yours again</Text>
          <Text style={styles.winText}>
            {task.method === 'drop' ? 'Dropped. ' : 'Handed over. '}Your weekly check-in will ask how it went.
          </Text>
          <Button title="Back to Home" icon="home" onPress={() => navigation.navigate('Main', { screen: 'Home' })} style={styles.winBtn} />
        </Animated.View>
      ) : null}

      <BottomSheet visible={sheet.open} onClose={() => setSheet((s) => ({ ...s, open: false }))}>
        <StepSheet
          key={sheet.id}
          stepKey={sheet.key}
          task={task}
          onDone={(patch) => {
            setSheet((s) => ({ ...s, open: false }));
            // Handed over (or dropped): straight back to Home, where the next task is waiting.
            if (patch.status === 'done') setTimeout(() => navigation.navigate('Main', { screen: 'Home' }), 260);
          }}
        />
      </BottomSheet>
    </Screen>
  );
}

/** One step, in the sheet: its question, the choices, a "Draft it for me", and Save. */
function StepSheet({ stepKey, task, onDone }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { update } = useHandoffs();
  const { onboarding } = useOnboarding();
  const [method, setMethod] = useState(task.method || null);
  const [plan, setPlan] = useState(task.plan || '');
  const [doneText, setDoneText] = useState(task.doneLooksLike || '');
  const [who, setWho] = useState(task.who || '');
  const [find, setFind] = useState(false);
  const [start, setStart] = useState(task.startDate || null);
  const [saving, setSaving] = useState(false);
  const tick = () => Haptics.selectionAsync().catch(() => {});
  const rate = onboarding?.buybackRate;
  const currency = onboarding?.currency || 'USD';

  const save = async (patch) => {
    setSaving(true);
    try {
      await update(task.activity, patch);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone(patch);
    } catch (err) {
      Alert.alert("Couldn't save that", err.message);
    } finally {
      setSaving(false);
    }
  };

  if (stepKey === 'how') {
    const ideas = handoffIdeas(task);
    return (
      <View>
        <Text style={styles.sheetTitle}>How will you hand it off?</Text>
        <View style={styles.grid}>
          {HANDOFF_METHODS.map((m) => {
            const on = method === m.key;
            return (
              <Pressable
                key={m.key}
                onPress={() => {
                  tick();
                  setMethod(m.key);
                  setPlan('');
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.choice, on && styles.choiceOn]}
              >
                <Ionicons name={m.icon} size={19} color={on ? colors.onColor : colors.primary} />
                <Text style={[styles.choiceText, on && styles.textOn]}>{m.label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.label}>✨ Suggested for this task</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.line}>
          {ideas.map((idea) => {
            const on = plan === idea.text;
            return (
              <Pressable
                key={idea.text}
                onPress={() => {
                  tick();
                  setMethod(idea.method);
                  setPlan(idea.text);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.idea, on && styles.ideaOn]}
              >
                <Text style={styles.ideaText}>{idea.text}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <Button title="Save" icon="checkmark" disabled={!method} loading={saving} onPress={() => save({ method, plan: plan || methodLabel(method) })} style={styles.save} />
      </View>
    );
  }

  if (stepKey === 'done') {
    return (
      <View>
        <Text style={styles.sheetTitle}>What does "done" look like?</Text>
        <Text style={styles.sheetSub}>So they know when it's finished and good enough.</Text>
        <TextInput value={doneText} onChangeText={setDoneText} placeholder="Type it here" placeholderTextColor={colors.muted} maxLength={200} multiline style={styles.input} />
        <Pressable onPress={() => setDoneText(task.method === 'automate' ? DONE_DRAFT.automate : DONE_DRAFT.default)} style={styles.draft} accessibilityRole="button">
          <Ionicons name="sparkles" size={15} color={colors.accentText} />
          <Text style={styles.draftText}>Draft it for me</Text>
        </Pressable>
        <Button title="Save" icon="checkmark" disabled={!doneText.trim()} loading={saving} onPress={() => save({ doneLooksLike: doneText.trim() })} style={styles.save} />
      </View>
    );
  }

  if (stepKey === 'who') {
    const automate = task.method === 'automate';
    const post = jobPostDraft({ task, doneLooksLike: task.doneLooksLike, rate, currency });
    return (
      <View>
        <Text style={styles.sheetTitle}>{automate ? 'Which tool will do it?' : task.method === 'team' ? 'Who on your team takes it?' : 'Who will do it?'}</Text>
        <TextInput value={who} onChangeText={setWho} placeholder={automate ? 'The tool' : 'Their name'} placeholderTextColor={colors.muted} maxLength={60} style={styles.input} />
        {automate ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.line}>
            {TOOL_IDEAS.map((t) => (
              <Pressable key={t} onPress={() => setWho(t)} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>{t}</Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : task.method === 'hire' ? (
          <>
            <Pressable onPress={() => setFind((v) => !v)} style={styles.draft} accessibilityRole="button" accessibilityState={{ expanded: find }}>
              <Ionicons name="sparkles" size={15} color={colors.accentText} />
              <Text style={styles.draftText}>No one yet? Draft a job post</Text>
            </Pressable>
            {find ? (
              <Animated.View entering={FadeIn.duration(200)} style={styles.post}>
                <Text style={styles.postText}>{post}</Text>
                <Button title="Share job post" icon="share-social" variant="secondary" onPress={() => Share.share({ message: post }).catch(() => {})} style={styles.postBtn} />
                <Text style={styles.postNote}>Come back and add their name once you've found someone.</Text>
              </Animated.View>
            ) : null}
          </>
        ) : null}
        <Button title="Save" icon="checkmark" disabled={!who.trim()} loading={saving} onPress={() => save({ who: who.trim() })} style={styles.save} />
      </View>
    );
  }

  if (stepKey === 'handover') {
    const message = handoverDraft({ task, who: task.who, doneLooksLike: task.doneLooksLike, start });
    return (
      <View>
        <Text style={styles.sheetTitle}>When does it start?</Text>
        <View style={styles.grid}>
          {startOptions().map((o) => {
            const on = sameDay(start, o.date);
            return (
              <Pressable
                key={o.key}
                onPress={() => {
                  tick();
                  setStart(o.date.toISOString());
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.choice, on && styles.choiceOn]}
              >
                <Text style={[styles.choiceText, on && styles.textOn]}>{o.label}</Text>
                <Text style={[styles.choiceSub, on && styles.textOn]}>{formatDay(o.date)}</Text>
              </Pressable>
            );
          })}
        </View>
        {task.method !== 'automate' && start ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.post}>
            <Text style={styles.label}>✨ A message to send them</Text>
            <Text style={styles.postText}>{message}</Text>
            <Button title="Send it" icon="share-social" variant="secondary" onPress={() => Share.share({ message }).catch(() => {})} style={styles.postBtn} />
          </Animated.View>
        ) : null}
        <Button title="Hand it over" icon="paper-plane" disabled={!start} loading={saving} onPress={() => save({ startDate: start, status: 'done' })} style={styles.save} />
      </View>
    );
  }

  // Drop it
  return (
    <View>
      <Text style={styles.sheetTitle}>Stop doing it</Text>
      <Text style={styles.sheetSub}>If nothing bad happens when it's not done, it never needed doing. You get {h(task.hours)} a day back.</Text>
      <Button title="Drop it" icon="close" loading={saving} onPress={() => save({ status: 'done' })} style={styles.save} />
    </View>
  );
}

const NODE = 32;
const makeStyles = (colors) => ({
  pressed: { opacity: 0.85 },
  mutedText: { color: colors.muted },
  // The road
  road: { marginTop: spacing.lg },
  stop: { flexDirection: 'row', gap: spacing.md },
  rail: { width: NODE, alignItems: 'center' },
  node: { width: NODE, height: NODE, borderRadius: NODE / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderStrong },
  nodeDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  nodeNow: { borderColor: brand.apricot, backgroundColor: colors.accentSoft, borderWidth: 3 },
  nodeNum: { fontSize: 14, fontWeight: '800', color: colors.muted },
  nodeNumNow: { color: colors.accentText },
  line: { flex: 1, width: 3, minHeight: 18, marginVertical: 4, borderRadius: 2, backgroundColor: colors.border },
  lineDone: { backgroundColor: colors.primary },
  station: { flex: 1, marginBottom: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  stationNow: { borderColor: brand.apricot, backgroundColor: colors.accentSoft },
  stationLocked: { backgroundColor: 'transparent', borderStyle: 'dashed' },
  stationHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stationTitle: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  summary: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: spacing.sm, paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: brand.apricot },
  goText: { fontSize: 13, fontWeight: '800', color: brand.evergreen },
  sun: { width: NODE + 8, height: NODE + 8, borderRadius: (NODE + 8) / 2, marginLeft: -4, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  sunOn: { backgroundColor: brand.apricot },
  dest: { flex: 1, paddingTop: 4 },
  destTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  destLine: { fontSize: 13, fontWeight: '700', color: colors.accentText, marginTop: 2 },
  win: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.successSoft },
  winTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  winText: { fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center', marginTop: 4 },
  winBtn: { marginTop: spacing.md },
  // The sheet
  sheetTitle: { fontSize: 20, fontWeight: '800', color: colors.text },
  sheetSub: { fontSize: 14, lineHeight: 20, color: colors.muted, marginTop: 4 },
  label: { fontSize: 12, fontWeight: '700', color: colors.accentText, marginTop: spacing.md, marginBottom: spacing.sm },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  choice: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 4, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  choiceOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  choiceText: { fontSize: 14, fontWeight: '800', color: colors.text, textAlign: 'center' },
  choiceSub: { fontSize: 12, color: colors.muted },
  textOn: { color: colors.onColor },
  line: { gap: 6 },
  idea: { maxWidth: 240, paddingHorizontal: 12, paddingVertical: 9, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  ideaOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  ideaText: { fontSize: 13, lineHeight: 18, color: colors.text },
  input: { marginTop: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, fontSize: 16, color: colors.text },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, marginTop: spacing.sm },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  draft: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.sm + 2, paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.accentSoft },
  draftText: { fontSize: 13, fontWeight: '800', color: colors.accentText },
  post: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  postText: { fontSize: 14, lineHeight: 21, color: colors.text },
  postBtn: { marginTop: spacing.sm + 4, minHeight: 44 },
  postNote: { fontSize: 12, color: colors.muted, marginTop: spacing.sm, textAlign: 'center' },
  save: { marginTop: spacing.lg },
});
