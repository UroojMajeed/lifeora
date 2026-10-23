import { useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import BottomSheet from '../components/BottomSheet';
import PlanEditor from '../components/PlanEditor';
import WindingRoad from '../components/WindingRoad';
import { useHandoffs } from '../context/HandoffsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { HANDOFF_METHODS, handoffIdeas } from '../constants/content';
import { formatDay, sameDay, startOptions } from '../constants/handoffSteps';
import { CHECK_DRAFT, DONE_DRAFT, TOOL_IDEAS, handoverDraft, jobPostDraft, journeyOf, planForMethod, planOf, stepSummary } from '../constants/journey';
import { formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;
const methodLabel = (key) => HANDOFF_METHODS.find((m) => m.key === key)?.label || '';

/**
 * Handing off one task, as a road winding through a sunrise: one stop per step, ending at the sun.
 * At the top, what the task costs you: its hours a day, and the money that time is worth. The steps are the
 * suggested ones unless you change them ("Edit steps": drag, rename, delete, add your own). The
 * current station opens its step in a sheet; its one button saves your answer and ticks the step.
 * Ticking the last step hands the task off: its hours are bought back, and the weekly check-in asks
 * if it stuck. Route param: `activity`.
 */
export default function HandoffJourneyScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { handoffs, update } = useHandoffs();
  const { onboarding } = useOnboarding();
  const task = handoffs.find((x) => x.activity === route.params?.activity);
  const [sheet, setSheet] = useState({ open: false, id: null, n: 0 });
  const [editing, setEditing] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);
  const [dragging, setDragging] = useState(false);

  if (!task) {
    return (
      <Screen>
        <PageHeader eyebrow="Hand it off" title="Nothing to hand off" />
      </Screen>
    );
  }

  const { steps, current, finished } = journeyOf(task);
  // What the task takes from you each day: its hours at what your hour is worth.
  const worth = onboarding?.effectiveHourlyRate;
  const money = (n) => formatMoney(n, onboarding?.currency || 'USD', { decimals: 0 });
  const open = (id) => {
    Haptics.selectionAsync().catch(() => {});
    setSheet((s) => ({ open: true, id, n: s.n + 1 }));
  };
  const savePlan = async (plan) => {
    setSavingPlan(true);
    try {
      await update(task.activity, { steps: plan.map(({ id, kind, title, done }) => ({ id, kind, title, done })), planConfirmed: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEditing(false);
    } catch (err) {
      Alert.alert("Couldn't save your steps", err.message);
    } finally {
      setSavingPlan(false);
    }
  };

  // Editing the steps (only when you ask for it).
  if (editing) {
    return (
      <Screen scrollEnabled={!dragging}>
        <PageHeader eyebrow="Hand it off" title={task.activity} subtitle={`${h(task.hours)} a day · drains you`} />
        <PlanEditor
          initial={planOf(task)}
          method={task.method}
          saving={savingPlan}
          onSave={savePlan}
          onCancel={() => setEditing(false)}
          onDragging={setDragging}
        />
      </Screen>
    );
  }

  const sheetStep = steps.find((s) => s.id === sheet.id);

  return (
    <Screen tinted="dawn">
      <PageHeader eyebrow="Hand it off" title={task.activity} />

      {/* What it costs you, and changing the steps. */}
      <View style={styles.facts}>
        <View style={styles.fact}>
          <Ionicons name="time-outline" size={14} color={colors.text} />
          <Text style={styles.factText}>
            {h(task.hours)} a day · <Text style={styles.drains}>drains you</Text>
          </Text>
        </View>
        {!finished ? (
          <Pressable onPress={() => setEditing(true)} hitSlop={8} style={styles.editPlan} accessibilityRole="button">
            <Ionicons name="create-outline" size={15} color={colors.primary} />
            <Text style={styles.editPlanText}>Edit steps</Text>
          </Pressable>
        ) : null}
      </View>
      {worth ? (
        <View style={styles.rateRow}>
          <View style={[styles.fact, styles.rateChip]}>
            <Ionicons name="cash-outline" size={14} color={colors.accentText} />
            <Text style={[styles.factText, styles.rateText]}>Costs you {money(task.hours * worth)} a day</Text>
          </View>
          <Text style={styles.rateNote}>
            Your hour is worth {money(worth)}, so {h(task.hours)} a day of this costs you {money(task.hours * worth)}. That's {money(task.hours * worth * 5)} a week.
          </Text>
        </View>
      ) : null}

      <WindingRoad steps={steps} current={current} hours={task.hours} onOpen={open} summaryOf={(s) => stepSummary(s.kind, task, methodLabel(task.method))} />

      {/* The 10-80-10 brief, once it's written: your start and finish, their middle. */}
      {task.method !== 'drop' && task.doneLooksLike && task.checkHow ? (
        <View style={styles.brief}>
          <Text style={styles.briefTitle}>The Brief</Text>
          {[
            ['10%', 'You', `Done looks like: ${task.doneLooksLike}`],
            ['80%', task.who || 'Them', 'Does the work, their way'],
            ['10%', 'You', `Check: ${task.checkHow}`],
          ].map(([pct, by, what], i) => (
            <View key={i} style={[styles.briefRow, i > 0 && styles.briefLine]}>
              <Text style={[styles.briefPct, i === 1 && styles.briefPctThem]}>{pct}</Text>
              <View style={styles.briefMain}>
                <Text style={styles.briefBy}>{by}</Text>
                <Text style={styles.briefWhat}>{what}</Text>
              </View>
            </View>
          ))}
        </View>
      ) : null}

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
        {sheetStep ? (
          <StepSheet
            key={sheet.n}
            step={sheetStep}
            task={task}
            onDone={(patch) => {
              setSheet((s) => ({ ...s, open: false }));
              // Handed over (or dropped): straight back to Home, where the next task is waiting.
              if (patch?.status === 'done') setTimeout(() => navigation.navigate('Main', { screen: 'Home' }), 260);
            }}
          />
        ) : null}
      </BottomSheet>
    </Screen>
  );
}

/**
 * One step, in the sheet: its question and helpers, and one button that saves the answer and ticks
 * the step (Save; Hand it over or Drop it on the last step; Mark done on your own steps). A step
 * you've already ticked opens to change its answer.
 */
function StepSheet({ step, task, onDone }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { update } = useHandoffs();
  const { onboarding } = useOnboarding();
  const [method, setMethod] = useState(task.method || null);
  const [plan, setPlan] = useState(task.plan || '');
  const [doneText, setDoneText] = useState(task.doneLooksLike || '');
  const [checkText, setCheckText] = useState(task.checkHow || '');
  const [who, setWho] = useState(task.who || '');
  const [find, setFind] = useState(false);
  const [start, setStart] = useState(task.startDate || null);
  const [saving, setSaving] = useState(false);
  const tick = () => Haptics.selectionAsync().catch(() => {});
  const rate = onboarding?.buybackRate;
  const currency = onboarding?.currency || 'USD';
  const kind = step.kind;

  // What the helpers hold, ready to save (only this step's own answers).
  const fields = () => {
    if (kind === 'how') return method ? { method, plan: plan || methodLabel(method) } : {};
    if (kind === 'brief') return { doneLooksLike: doneText.trim(), checkHow: checkText.trim() };
    if (kind === 'who') return { who: who.trim() };
    if (kind === 'handover') return start ? { startDate: start } : {};
    return {};
  };
  const strip = (list) => list.map(({ id, kind: k, title, done }) => ({ id, kind: k, title, done }));

  const run = async (patch) => {
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
  // Save and tick this step (choosing how may also reshape the steps); the last one hands it off.
  // An already ticked step just saves its new answer.
  const save = () => {
    if (step.done && kind !== 'how') return run(fields());
    const now = planOf(task);
    const next = kind === 'how' ? planForMethod(now, method) : now.map((s) => (s.id === step.id ? { ...s, done: true } : s));
    const all = next.every((s) => s.done);
    return run({ ...fields(), steps: strip(next), status: all ? 'done' : 'in_progress' });
  };

  // What the step needs before it can be saved, and its button.
  const ready = {
    how: Boolean(method),
    brief: Boolean(doneText.trim() && checkText.trim()),
    who: Boolean(who.trim()),
    handover: Boolean(start),
  }[kind] ?? true;
  const action =
    kind === 'handover' ? { title: 'Hand it over', icon: 'paper-plane' }
    : kind === 'drop' ? { title: 'Drop it', icon: 'close' }
    : kind === 'custom' ? { title: 'Mark done', icon: 'checkmark' }
    : { title: 'Save', icon: 'checkmark' };
  const ideas = kind === 'how' ? handoffIdeas(task) : [];
  const automate = task.method === 'automate';
  const post = kind === 'who' ? jobPostDraft({ task, doneLooksLike: task.doneLooksLike, rate, currency }) : '';
  const message = kind === 'handover' ? handoverDraft({ task, who: task.who, doneLooksLike: task.doneLooksLike, checkHow: task.checkHow, start }) : '';

  return (
    <View>
      <Text style={styles.sheetTitle}>{step.title}</Text>

      {kind === 'how' ? (
        <View>
          <Text style={styles.sheetSub}>How will you hand it off?</Text>
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
          {method === 'drop' && task.method !== 'drop' ? <Text style={styles.note}>Dropping it shortens your plan to one more step: stop doing it.</Text> : null}
        </View>
      ) : null}

      {kind === 'brief' ? (
        <View>
          <Text style={styles.sheetSub}>You set the start and the finish. They own the 80% in between.</Text>
          <Text style={styles.qLabel}>
            <Text style={styles.qPct}>10% · </Text>What does done look like?
          </Text>
          <TextInput value={doneText} onChangeText={setDoneText} placeholder="e.g. Finished the same day" placeholderTextColor={colors.muted} maxLength={200} multiline style={styles.input} />
          <Text style={styles.qLabel}>
            <Text style={styles.qPct}>10% · </Text>How will you check it?
          </Text>
          <TextInput value={checkText} onChangeText={setCheckText} placeholder="e.g. A look every Friday" placeholderTextColor={colors.muted} maxLength={200} multiline style={styles.input} />
          <Pressable
            onPress={() => {
              setDoneText(automate ? DONE_DRAFT.automate : DONE_DRAFT.default);
              setCheckText(automate ? CHECK_DRAFT.automate : CHECK_DRAFT.default);
            }}
            style={styles.draft}
            accessibilityRole="button"
          >
            <Ionicons name="sparkles" size={15} color={colors.accentText} />
            <Text style={styles.draftText}>Draft both for me</Text>
          </Pressable>
        </View>
      ) : null}

      {kind === 'who' ? (
        <View>
          <Text style={styles.sheetSub}>{automate ? 'Which tool will do it?' : task.method === 'team' ? 'Who on your team takes it?' : 'Who will do it?'}</Text>
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
                </Animated.View>
              ) : null}
            </>
          ) : null}
        </View>
      ) : null}

      {kind === 'handover' ? (
        <View>
          <Text style={styles.sheetSub}>When does it start?</Text>
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
          {!automate ? (
            <View style={styles.post}>
              <Text style={styles.label}>✨ A message to send them</Text>
              <Text style={styles.postText}>{message}</Text>
              <Button title="Send it" icon="share-social" variant="secondary" onPress={() => Share.share({ message }).catch(() => {})} style={styles.postBtn} />
            </View>
          ) : null}
        </View>
      ) : null}

      {kind === 'drop' ? (
        <Text style={styles.sheetSub}>If nothing bad happens when it's not done, it never needed doing. You get {h(task.hours)} a day back.</Text>
      ) : null}

      {kind === 'custom' ? <Text style={styles.sheetSub}>Your own step. Do it your way, then tick it here.</Text> : null}

      {kind === 'custom' && step.done ? null : (
        <Button title={action.title} icon={action.icon} disabled={!ready} loading={saving} onPress={save} style={styles.save} />
      )}
    </View>
  );
}

const makeStyles = (colors) => ({
  pressed: { opacity: 0.85 },
  mutedText: { color: colors.muted },
  // At the top
  facts: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginTop: -spacing.sm },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface },
  factText: { fontSize: 13, fontWeight: '700', color: colors.text },
  drains: { color: colors.error },
  rateRow: { marginTop: spacing.sm, gap: 4 },
  rateChip: { backgroundColor: colors.accentSoft },
  rateText: { color: colors.accentText },
  rateNote: { fontSize: 12, lineHeight: 17, color: colors.muted },
  win: { marginTop: spacing.lg, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.successSoft },
  winTitle: { fontSize: 18, fontWeight: '800', color: colors.text, textAlign: 'center' },
  winText: { fontSize: 14, lineHeight: 20, color: colors.text, textAlign: 'center', marginTop: 4 },
  winBtn: { marginTop: spacing.md },
  // The brief
  brief: { marginTop: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border },
  briefTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.xs },
  briefRow: { flexDirection: 'row', gap: spacing.md, paddingVertical: spacing.sm },
  briefLine: { borderTopWidth: 1, borderTopColor: colors.border },
  briefPct: { width: 44, fontSize: 16, fontWeight: '800', color: colors.accentText },
  briefPctThem: { color: colors.primary },
  briefMain: { flex: 1, minWidth: 0 },
  briefBy: { fontSize: 13, fontWeight: '800', color: colors.text },
  briefWhat: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 1 },
  // The sheet
  qLabel: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: spacing.md },
  qPct: { color: colors.accentText },
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
  note: { fontSize: 13, lineHeight: 19, color: colors.accentText, marginTop: spacing.md },
  yours: { fontSize: 11, fontWeight: '800', color: colors.accentText },
  editPlan: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.primary },
  editPlanText: { fontSize: 14, fontWeight: '800', color: colors.primary },
});
