import { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, Text, TextInput, View } from 'react-native';
import Animated, { FadeInRight, ZoomIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import Button from '../components/Button';
import { useHandoffs } from '../context/HandoffsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { HANDOFF_METHODS, handoffIdeas } from '../constants/content';
import { DONE_EXAMPLES, PLAYBOOK_SUGGESTIONS, formatDay, helpFor, sameDay, startOptions } from '../constants/handoffSteps';
import { formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;
const WHO = { hire: 'Who will do it?', team: 'Who on your team takes it?', automate: 'Which tool will do it?' };
const WHO_HINT = { hire: 'A name, or find someone below', team: "Your teammate's name", automate: 'e.g. Calendly, Zapier, QuickBooks' };

/** The steps for a way of handing off: dropping a task is one decision; the others need a little setup. */
const stepsFor = (method) => (method === 'drop' ? ['how', 'drop'] : ['how', 'done', 'playbook', 'who', 'when']);

/** A ready-to-share job post for a task, priced at the user's Buyback Rate. */
function jobPost({ task, draft, rate, currency }) {
  const lines = [`Looking for help with ${task.activity.toLowerCase()}: about ${h(task.hours * 5)} a week.`, ''];
  if (draft.playbook.length) lines.push("What you'll do:", ...draft.playbook.map((s) => `- ${s}`), '');
  if (draft.doneLooksLike) lines.push(`Done looks like: ${draft.doneLooksLike}`, '');
  if (rate) lines.push(`Budget: up to ${formatMoney(rate, currency)}/hr.`);
  return lines.join('\n').trim();
}

/**
 * How to hand off one draining task, one step per screen: choose how (with ideas for this task),
 * what "done" looks like, the steps (a short playbook), who or which tool takes it (with a job post
 * to share when you need to find someone), and when it starts. Dropping a task is a single decision.
 * Each step saves as you go; the end marks it handed over (in progress), and the weekly check-in asks
 * how it went. Route param: `activity`. (In preview: reached from Me, not from Home yet.)
 */
export default function DelegateFlowScreen({ navigation, route }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { handoffs, update } = useHandoffs();
  const { onboarding } = useOnboarding();
  const task = handoffs.find((x) => x.activity === route.params?.activity);

  const [draft, setDraft] = useState(() => ({
    method: task?.method || null,
    plan: task?.plan || '',
    doneLooksLike: task?.doneLooksLike || '',
    playbook: task?.playbook || [],
    who: task?.who || '',
    startDate: task?.startDate || null,
  }));
  const [index, setIndex] = useState(0);
  const [stepText, setStepText] = useState(''); // a playbook step being typed
  const [findSomeone, setFindSomeone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finished, setFinished] = useState(false);

  const steps = stepsFor(draft.method);
  const step = steps[index];
  const ideas = useMemo(() => (task ? handoffIdeas(task) : []), [task]);
  const set = (patch) => setDraft((d) => ({ ...d, ...patch }));
  const tick = () => Haptics.selectionAsync().catch(() => {});

  if (!task) {
    return (
      <Screen>
        <Text style={styles.title}>Nothing to hand off</Text>
        <Button title="Back" variant="secondary" onPress={() => navigation.goBack()} style={styles.gap} />
      </Screen>
    );
  }

  // What each step saves, and whether it can move on.
  const patchFor = {
    how: { method: draft.method, plan: draft.plan || HANDOFF_METHODS.find((m) => m.key === draft.method)?.label || '' },
    done: { doneLooksLike: draft.doneLooksLike },
    playbook: { playbook: draft.playbook },
    who: { who: draft.who },
    when: { startDate: draft.startDate, status: 'in_progress' },
    drop: { status: 'done' },
  };
  const canGo = {
    how: Boolean(draft.method),
    done: true, // optional
    playbook: true, // optional, but encouraged
    who: Boolean(draft.who.trim()) || findSomeone,
    when: Boolean(draft.startDate),
    drop: true,
  }[step];

  const next = async () => {
    setSaving(true);
    try {
      await update(task.activity, patchFor[step]);
      if (index < steps.length - 1) setIndex(index + 1);
      else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setFinished(true);
      }
    } catch (err) {
      Alert.alert("Couldn't save that", err.message);
    } finally {
      setSaving(false);
    }
  };

  const addStep = (text) => {
    const s = text.trim();
    if (!s || draft.playbook.includes(s) || draft.playbook.length >= 15) return;
    tick();
    set({ playbook: [...draft.playbook, s] });
    setStepText('');
  };

  // ---- The end.
  if (finished) {
    const dropped = draft.method === 'drop';
    return (
      <Screen footer={<Button title="Done" icon="checkmark" onPress={() => navigation.goBack()} />}>
        <View style={styles.summary}>
          <Animated.View entering={ZoomIn.duration(350)} style={styles.doneIcon}>
            <Ionicons name={dropped ? 'close' : 'paper-plane'} size={34} color={colors.heroFrom} />
          </Animated.View>
          <Text style={styles.summaryTitle}>{dropped ? 'Dropped' : 'Handed over'}</Text>
          <Text style={styles.summaryText}>
            {dropped
              ? `${task.activity} is off your list: ${h(task.hours)} a day back.`
              : `${task.activity} goes to ${draft.who || 'its new owner'} from ${formatDay(draft.startDate)}. Your weekly check-in will ask how it went.`}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <Button
          title={step === 'drop' ? 'Drop it' : index === steps.length - 1 ? 'Hand it over' : 'Next'}
          icon={step === 'drop' ? 'close' : 'arrow-forward'}
          onPress={next}
          disabled={!canGo}
          loading={saving}
        />
      }
    >
      {/* Close or back, and where you are. */}
      <View style={styles.top}>
        <Pressable
          onPress={index ? () => setIndex(index - 1) : () => navigation.goBack()}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={index ? 'Previous step' : 'Close'}
          style={styles.iconBtn}
        >
          <Ionicons name={index ? 'arrow-back' : 'close'} size={20} color={colors.text} />
        </Pressable>
        <View style={styles.progress}>
          {steps.map((s, i) => (
            <View key={s} style={[styles.seg, i <= index && styles.segOn]} />
          ))}
        </View>
        <Text style={styles.count}>
          {index + 1}/{steps.length}
        </Text>
      </View>

      <Text style={styles.task}>
        {task.activity} · {h(task.hours)} a day
      </Text>

      <Animated.View key={step} entering={FadeInRight.duration(250)}>
        {step === 'how' ? (
          <>
            <Text style={styles.title}>How will you hand it off?</Text>
            <View style={styles.methods}>
              {HANDOFF_METHODS.map((m) => {
                const on = draft.method === m.key;
                return (
                  <Pressable
                    key={m.key}
                    onPress={() => {
                      tick();
                      set({ method: m.key, plan: '' });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.method, on && styles.methodOn]}
                  >
                    <Ionicons name={m.icon} size={20} color={on ? colors.onColor : colors.primary} />
                    <Text style={[styles.methodText, on && styles.textOn]}>{m.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.label}>Ideas for this task</Text>
            <View style={styles.ideas}>
              {ideas.map((idea) => {
                const on = draft.plan === idea.text;
                return (
                  <Pressable
                    key={idea.text}
                    onPress={() => {
                      tick();
                      set({ method: idea.method, plan: idea.text });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.idea, on && styles.ideaOn]}
                  >
                    <Ionicons name={on ? 'checkmark-circle' : 'bulb-outline'} size={18} color={on ? colors.primary : colors.accentText} />
                    <Text style={styles.ideaText}>{idea.text}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 'done' ? (
          <>
            <Text style={styles.title}>What does "done" look like?</Text>
            <Text style={styles.sub}>So they know when it's finished and good enough.</Text>
            <TextInput
              value={draft.doneLooksLike}
              onChangeText={(t) => set({ doneLooksLike: t })}
              placeholder="Type it, or tap one below"
              placeholderTextColor={colors.muted}
              maxLength={200}
              multiline
              style={styles.input}
            />
            <View style={styles.chips}>
              {helpFor(DONE_EXAMPLES, draft.method).map((ex) => (
                <Pressable key={ex} onPress={() => set({ doneLooksLike: ex })} style={styles.chip} accessibilityRole="button">
                  <Text style={styles.chipText}>{ex}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {step === 'playbook' ? (
          <>
            <Text style={styles.title}>{draft.method === 'automate' ? 'List the setup steps' : 'Write the steps'}</Text>
            <View style={styles.tip}>
              <Ionicons name="videocam-outline" size={16} color={colors.accentText} />
              <Text style={styles.tipText}>
                {draft.method === 'automate' ? 'A few steps to set it up once.' : 'Easiest way: record yourself doing it once, then write the steps from the video.'}
              </Text>
            </View>
            {draft.playbook.map((s, i) => (
              <View key={s} style={styles.stepRow}>
                <Text style={styles.stepNum}>{i + 1}</Text>
                <Text style={styles.stepText}>{s}</Text>
                <Pressable onPress={() => set({ playbook: draft.playbook.filter((x) => x !== s) })} hitSlop={10} accessibilityLabel={`Remove ${s}`}>
                  <Ionicons name="close" size={16} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            <View style={styles.addRow}>
              <TextInput
                value={stepText}
                onChangeText={setStepText}
                onSubmitEditing={() => addStep(stepText)}
                placeholder="Add a step"
                placeholderTextColor={colors.muted}
                maxLength={120}
                returnKeyType="done"
                style={[styles.input, styles.addInput]}
              />
              <Pressable onPress={() => addStep(stepText)} disabled={!stepText.trim()} style={styles.addBtn} accessibilityLabel="Add step">
                <Ionicons name="add" size={22} color={colors.onColor} />
              </Pressable>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.line}>
              {helpFor(PLAYBOOK_SUGGESTIONS, draft.method)
                .filter((s) => !draft.playbook.includes(s))
                .map((s) => (
                  <Pressable key={s} onPress={() => addStep(s)} style={styles.chip} accessibilityRole="button">
                    <Ionicons name="add" size={13} color={colors.muted} />
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
            </ScrollView>
          </>
        ) : null}

        {step === 'who' ? (
          <>
            <Text style={styles.title}>{WHO[draft.method]}</Text>
            <TextInput
              value={draft.who}
              onChangeText={(t) => set({ who: t })}
              placeholder={WHO_HINT[draft.method]}
              placeholderTextColor={colors.muted}
              maxLength={60}
              style={styles.input}
            />
            {draft.method === 'hire' ? (
              <>
                <Pressable
                  onPress={() => {
                    tick();
                    setFindSomeone((v) => !v);
                  }}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: findSomeone }}
                  style={styles.find}
                >
                  <Ionicons name={findSomeone ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
                  <Text style={styles.findText}>I need to find someone</Text>
                </Pressable>
                {findSomeone ? (
                  <View style={styles.post}>
                    <Text style={styles.postLabel}>A job post, ready to share</Text>
                    <Text style={styles.postText}>{jobPost({ task, draft, rate: onboarding?.buybackRate, currency: onboarding?.currency || 'USD' })}</Text>
                    <Button
                      title="Share job post"
                      icon="share-social"
                      variant="secondary"
                      onPress={() => Share.share({ message: jobPost({ task, draft, rate: onboarding?.buybackRate, currency: onboarding?.currency || 'USD' }) }).catch(() => {})}
                      style={styles.gap}
                    />
                  </View>
                ) : null}
              </>
            ) : null}
          </>
        ) : null}

        {step === 'when' ? (
          <>
            <Text style={styles.title}>When does it start?</Text>
            <Text style={styles.sub}>From that day, it's theirs. We'll ask how it went in your weekly check-in.</Text>
            <View style={styles.methods}>
              {startOptions().map((o) => {
                const on = sameDay(draft.startDate, o.date);
                return (
                  <Pressable
                    key={o.key}
                    onPress={() => {
                      tick();
                      set({ startDate: o.date.toISOString() });
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.method, on && styles.methodOn]}
                  >
                    <Text style={[styles.methodText, on && styles.textOn]}>{o.label}</Text>
                    <Text style={[styles.methodSub, on && styles.textOn]}>{formatDay(o.date)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {step === 'drop' ? (
          <>
            <Text style={styles.title}>Stop doing it</Text>
            <Text style={styles.sub}>
              If nothing bad happens when it's not done, it never needed doing. You get {h(task.hours)} a day back.
            </Text>
          </>
        ) : null}
      </Animated.View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  gap: { marginTop: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, paddingTop: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  progress: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: 3, backgroundColor: colors.border },
  segOn: { backgroundColor: colors.primary },
  count: { fontSize: 13, fontWeight: '700', color: colors.muted },
  task: { fontSize: 12, fontWeight: '700', color: colors.primary, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: spacing.lg },
  title: { fontSize: 24, lineHeight: 30, fontWeight: '800', color: colors.text, letterSpacing: -0.4, marginTop: spacing.sm },
  sub: { fontSize: 15, lineHeight: 21, color: colors.muted, marginTop: spacing.sm },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: spacing.lg, marginBottom: spacing.sm },
  // Choices
  methods: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.lg },
  method: { width: '48%', flexGrow: 1, alignItems: 'center', gap: 6, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  methodOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  methodText: { fontSize: 14, fontWeight: '800', color: colors.text, textAlign: 'center' },
  methodSub: { fontSize: 12, color: colors.muted },
  textOn: { color: colors.onColor },
  ideas: { gap: spacing.sm },
  idea: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  ideaOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  ideaText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  // Inputs and chips
  input: { marginTop: spacing.md, minHeight: 48, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, fontSize: 16, color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm + 4 },
  line: { gap: 6, paddingTop: spacing.sm + 4 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  // Playbook
  tip: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm + 4, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  stepNum: { width: 22, height: 22, borderRadius: 11, textAlign: 'center', fontSize: 12, fontWeight: '800', color: colors.onColor, backgroundColor: colors.primary, overflow: 'hidden' },
  stepText: { flex: 1, fontSize: 14, color: colors.text },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm },
  addInput: { flex: 1 },
  addBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  // Who
  find: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  findText: { fontSize: 15, fontWeight: '700', color: colors.text },
  post: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  postLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: spacing.sm },
  postText: { fontSize: 14, lineHeight: 21, color: colors.text },
  // The end
  summary: { alignItems: 'center', paddingTop: spacing.xxl },
  doneIcon: { width: 76, height: 76, borderRadius: 38, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft },
  summaryTitle: { fontSize: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.5, marginTop: spacing.md },
  summaryText: { fontSize: 15, lineHeight: 22, color: colors.muted, textAlign: 'center', marginTop: spacing.sm, maxWidth: 320 },
});
