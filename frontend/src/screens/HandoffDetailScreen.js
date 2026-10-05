import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, LayoutAnimation, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import Toast from '../components/Toast';
import { useHandoffs } from '../context/HandoffsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { DRIP, HANDOFF_METHODS, handoffIdeas } from '../constants/content';
import {
  DONE_EXAMPLES,
  PLAYBOOK_SUGGESTIONS,
  checkInDate,
  formatDay,
  handoffSteps,
  helpFor,
  nextStep,
  sameDay,
  startOptions,
} from '../constants/handoffSteps';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours, formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const methodInfo = (key) => HANDOFF_METHODS.find((m) => m.key === key);
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/**
 * One draining task, handed off step by step: choose how → define done → playbook → hand it over →
 * check in after a week. The current step is open; tap any step to open it.
 */
export default function HandoffDetailScreen({ route, navigation }) {
  const { activity } = route.params;
  const { handoffs, summary, update, refresh } = useHandoffs();
  const { onboarding } = useOnboarding();
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const item = handoffs.find((h) => h.activity === activity);

  const [open, setOpen] = useState(null);
  const [doneText, setDoneText] = useState('');
  const [stepDraft, setStepDraft] = useState('');
  const [who, setWho] = useState('');
  const [start, setStart] = useState(null);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Opened before the list loaded (e.g. straight from Home): load it. If it's loaded and the task
  // isn't there (e.g. the account was reset), go back.
  useEffect(() => {
    if (!summary) refresh();
    else if (!item) navigation.goBack();
  }, [summary, item, refresh, navigation]);

  // Fill the fields and open the current step once the task arrives.
  useEffect(() => {
    if (!item) return;
    setDoneText(item.doneLooksLike || '');
    setWho(item.who || '');
    setStart(item.startDate || null);
    setNotes(item.notes || '');
    setOpen(nextStep(item)?.key || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Boolean(item)]);

  const save = useCallback(
    async (patch) => {
      setError('');
      try {
        return await update(activity, patch);
      } catch (err) {
        setError(err.message);
        return null;
      }
    },
    [activity, update]
  );

  if (!item) {
    return (
      <Screen>
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.xxl }} />
      </Screen>
    );
  }

  const q = DRIP[item.quadrant];
  const done = item.status === 'done';
  const steps = handoffSteps(item);
  const doneCount = steps.filter((s) => s.done).length;
  const automate = item.method === 'automate';
  const rate = onboarding?.buybackRate || 0;
  const currency = onboarding?.currency || 'USD';
  const weeklyHours = item.hours * WORKDAYS_PER_WEEK;

  // After saving a step, open the next one that still needs doing.
  const advance = (updated) => {
    animate();
    setOpen(nextStep(updated || item)?.key || null);
  };

  const markDone = async () => {
    const res = await save({ status: 'done' });
    if (!res) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    animate();
    setOpen(null);
    setToast(`You just bought back ${formatHours(item.hours)} a day.`);
  };

  // Some handoffs take months (a key hire): keep it for the next round so this one can finish.
  const keepForLater = async () => {
    Haptics.selectionAsync().catch(() => {});
    const res = await save({ status: 'later' });
    if (res) {
      animate();
      setOpen(null);
      setToast('Kept for the next round.');
    }
  };
  const bringBack = () => {
    Haptics.selectionAsync().catch(() => {});
    save({ status: item.who && item.startDate ? 'in_progress' : 'mine' }).then((res) => res && advance(res.handoff));
  };

  const undoDone = () => {
    Haptics.selectionAsync().catch(() => {});
    save({ status: item.who && item.startDate ? 'in_progress' : 'mine' }).then((res) => res && advance(res.handoff));
  };

  // Step 1: tap an idea to make it the plan; tap it again to clear it.
  const choose = async (idea) => {
    Haptics.selectionAsync().catch(() => {});
    const chosen = item.plan === idea.text;
    const res = await save(chosen ? { plan: '', method: null } : { plan: idea.text, method: idea.method });
    if (res && !chosen) advance(res.handoff);
  };

  // Step 2
  const addExample = (text) => {
    Haptics.selectionAsync().catch(() => {});
    setDoneText((t) => (t.trim() ? `${t.trim().replace(/[.,]$/, '')}, ${text.toLowerCase()}` : text).slice(0, 200));
  };
  const saveDone = async () => {
    const res = await save({ doneLooksLike: doneText.trim() });
    if (res) advance(res.handoff);
  };

  // Step 3
  const playbook = item.playbook || [];
  const addStep = async (text) => {
    const t = text.trim();
    if (!t || playbook.includes(t) || playbook.length >= 15) return;
    Haptics.selectionAsync().catch(() => {});
    animate();
    const res = await save({ playbook: [...playbook, t] });
    if (res) setStepDraft('');
  };
  const removeStep = (index) => {
    animate();
    save({ playbook: playbook.filter((_, i) => i !== index) });
  };

  // Step 4
  const handOver = async () => {
    const patch = { who: who.trim(), startDate: start };
    if (item.status === 'mine') patch.status = 'in_progress';
    const res = await save(patch);
    if (!res) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setToast(`Handed over. Check in on ${formatDay(checkInDate(res.handoff))}.`);
    advance(res.handoff);
  };

  const saveNotes = () => {
    if ((item.notes || '') !== notes.trim()) save({ notes: notes.trim() });
  };

  const costLine = () => {
    const frees = `Frees ${formatHours(weeklyHours)} a week.`;
    const cap = formatMoney(weeklyHours * rate, currency, { decimals: 0 });
    if (item.method === 'drop') return `${frees} Costs nothing.`;
    if (item.method === 'automate') return `${frees} Most tools cost far less than your Buyback Rate.`;
    if (item.method === 'team') return `${frees} Your team takes it so you can do higher-value work.`;
    return `${frees} Paying someone your Buyback Rate would cost at most ${cap} a week.`;
  };

  const summaryOf = (key) => {
    if (key === 'how') return item.plan;
    if (key === 'define') return item.doneLooksLike;
    if (key === 'playbook') return playbook.length ? `${playbook.length} ${playbook.length === 1 ? 'step' : 'steps'}` : '';
    if (key === 'handover') return item.who && item.startDate ? `${item.who} · from ${formatDay(item.startDate)}` : '';
    if (key === 'checkin' && item.startDate && !done && item.method !== 'drop') return `On ${formatDay(checkInDate(item))}`;
    return '';
  };

  const renderStep = (key) => {
    if (key === 'how') {
      return (
        <>
          <Text style={styles.help}>{costLine()}</Text>
          <View style={styles.ideas}>
            {handoffIdeas(item).map((idea) => {
              const chosen = item.plan === idea.text;
              const m = methodInfo(idea.method);
              return (
                <Pressable
                  key={idea.text}
                  onPress={() => choose(idea)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: chosen }}
                  accessibilityLabel={`${m.label}: ${idea.text}`}
                  style={({ pressed }) => [styles.idea, chosen && styles.ideaOn, pressed && { opacity: 0.85 }]}
                >
                  <View style={[styles.ideaIcon, chosen && styles.ideaIconOn]}>
                    <Ionicons name={m.icon} size={18} color={chosen ? colors.onColor : colors.primaryDark} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ideaKind}>{m.label}</Text>
                    <Text style={styles.ideaText}>{idea.text}</Text>
                  </View>
                  <Ionicons name={chosen ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={chosen ? colors.primary : colors.border} />
                </Pressable>
              );
            })}
          </View>
        </>
      );
    }

    if (key === 'define') {
      return (
        <>
          <Text style={styles.help}>What does a good result look like? One line is enough.</Text>
          <TextInput
            value={doneText}
            onChangeText={setDoneText}
            placeholder={automate ? 'e.g. Runs every day, I get an alert if it fails' : 'e.g. Inbox cleared by 5pm, only urgent emails come to me'}
            placeholderTextColor={colors.muted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            maxLength={200}
            multiline
            style={[styles.input, styles.multi]}
            accessibilityLabel="What done looks like"
          />
          <View style={styles.chips}>
            {helpFor(DONE_EXAMPLES, item.method).map((ex) => (
              <Pressable key={ex} onPress={() => addExample(ex)} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
                <Ionicons name="add" size={14} color={colors.primaryDark} />
                <Text style={styles.chipText}>{ex}</Text>
              </Pressable>
            ))}
          </View>
          <Button title="Save" icon="checkmark" onPress={saveDone} disabled={!doneText.trim()} style={styles.stepButton} />
        </>
      );
    }

    if (key === 'playbook') {
      const ideas = helpFor(PLAYBOOK_SUGGESTIONS, item.method).filter((s) => !playbook.includes(s));
      return (
        <>
          <Text style={styles.help}>
            {automate ? 'What it takes to set up, so it runs on its own.' : 'Everything someone needs to do it without asking you.'}
          </Text>
          {playbook.map((s, i) => (
            <View key={s} style={styles.pbRow}>
              <Text style={styles.pbNum}>{i + 1}</Text>
              <Text style={styles.pbText}>{s}</Text>
              <Pressable onPress={() => removeStep(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove step ${i + 1}`}>
                <Ionicons name="close" size={18} color={colors.muted} />
              </Pressable>
            </View>
          ))}
          <View style={styles.addRow}>
            <TextInput
              value={stepDraft}
              onChangeText={setStepDraft}
              onSubmitEditing={() => addStep(stepDraft)}
              placeholder="Add a step"
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              maxLength={120}
              returnKeyType="done"
              blurOnSubmit={false}
              style={[styles.input, { flex: 1 }]}
              accessibilityLabel="New playbook step"
            />
            <Pressable
              onPress={() => addStep(stepDraft)}
              disabled={!stepDraft.trim()}
              accessibilityRole="button"
              accessibilityLabel="Add step"
              style={({ pressed }) => [styles.addBtn, !stepDraft.trim() && { opacity: 0.4 }, pressed && { opacity: 0.7 }]}
            >
              <Ionicons name="add" size={22} color={colors.onColor} />
            </Pressable>
          </View>
          {ideas.length ? (
            <>
              <Text style={styles.subLabel}>Suggestions</Text>
              <View style={styles.chips}>
                {ideas.map((s) => (
                  <Pressable key={s} onPress={() => addStep(s)} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
                    <Ionicons name="add" size={14} color={colors.primaryDark} />
                    <Text style={styles.chipText}>{s}</Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : null}
          {playbook.length ? <Button title="Next step" icon="arrow-forward" variant="secondary" onPress={() => advance()} style={styles.stepButton} /> : null}
        </>
      );
    }

    if (key === 'handover') {
      const options = startOptions();
      const custom = start && !options.some((o) => sameDay(o.date, start));
      return (
        <>
          <Text style={styles.subLabel}>{automate ? 'Which tool?' : "Who's taking it?"}</Text>
          <TextInput
            value={who}
            onChangeText={setWho}
            placeholder={automate ? 'e.g. Zapier, accounting software' : 'e.g. Ayesha, my assistant'}
            placeholderTextColor={colors.muted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            maxLength={60}
            returnKeyType="done"
            style={styles.input}
            accessibilityLabel={automate ? 'Which tool' : "Who's taking it"}
          />
          <Text style={styles.subLabel}>{automate ? 'Starts running' : 'They start'}</Text>
          <View style={styles.chips}>
            {custom ? (
              <View style={[styles.chip, styles.chipOn]}>
                <Text style={[styles.chipText, styles.chipTextOn]}>{formatDay(start)}</Text>
              </View>
            ) : null}
            {options.map((o) => {
              const on = sameDay(o.date, start);
              return (
                <Pressable
                  key={o.key}
                  onPress={() => {
                    Haptics.selectionAsync().catch(() => {});
                    setStart(o.date.toISOString());
                  }}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: on }}
                  style={({ pressed }) => [styles.chip, on && styles.chipOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.chipText, on && styles.chipTextOn]}>{o.label}</Text>
                </Pressable>
              );
            })}
          </View>
          <Button
            title={automate ? 'Switch it on' : 'Hand it over'}
            icon={automate ? 'flash' : 'paper-plane'}
            onPress={handOver}
            disabled={!who.trim() || !start}
            style={styles.stepButton}
          />
        </>
      );
    }

    // checkin
    if (item.method === 'drop') {
      return (
        <>
          <Text style={styles.help}>Tell anyone who needs to know, then let it go.</Text>
          <Button title="I've stopped doing it" icon="checkmark-circle" onPress={markDone} style={styles.stepButton} />
        </>
      );
    }
    const due = checkInDate(item);
    return (
      <>
        <Text style={styles.help}>
          {due && due > new Date()
            ? `Give it a week. On ${formatDay(due)}, check: is it running without you, the way you described "done"?`
            : 'Is it running without you, the way you described "done"? Then it is off your plate.'}
        </Text>
        {item.doneLooksLike ? (
          <View style={styles.quote}>
            <Ionicons name="flag-outline" size={14} color={colors.primaryDark} />
            <Text style={styles.quoteText}>{item.doneLooksLike}</Text>
          </View>
        ) : null}
        <Button title="Yes, it's handed off" icon="checkmark-circle" onPress={markDone} style={styles.stepButton} />
      </>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen>
        <PageHeader
          eyebrow={q.name}
          title={item.activity}
          subtitle={`${formatHours(item.hours)} a day. Handing it off frees ${formatHours(weeklyHours)} a week.`}
        />

        {done ? (
          <View style={styles.doneBanner}>
            <Ionicons name="checkmark-circle" size={28} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doneTitle}>Handed off</Text>
              <Text style={styles.doneText}>
                {item.doneAt ? `Since ${formatDay(item.doneAt)}. ` : ''}You bought back {formatHours(item.hours)} a day.
              </Text>
            </View>
            <Pressable onPress={undoDone} hitSlop={10} accessibilityRole="button" accessibilityLabel="Not handed off after all">
              <Text style={styles.undo}>Undo</Text>
            </Pressable>
          </View>
        ) : item.status === 'later' ? (
          <View style={[styles.doneBanner, { backgroundColor: colors.surfaceAlt }]}>
            <Ionicons name="time-outline" size={26} color={colors.muted} />
            <View style={{ flex: 1 }}>
              <Text style={styles.doneTitle}>Kept for the next round</Text>
              <Text style={styles.doneText}>It won't hold up this round. Your progress on it is saved.</Text>
            </View>
            <Pressable onPress={bringBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Work on it this round">
              <Text style={styles.undo}>Bring back</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.progress}>
            <View style={styles.progressTop}>
              <Text style={styles.progressLabel}>Your handoff checklist</Text>
              <Text style={styles.progressCount}>
                {doneCount} of {steps.length}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${(doneCount / steps.length) * 100}%` }]} />
            </View>
          </View>
        )}

        <View style={styles.steps}>
          {steps.map((s, i) => {
            const isOpen = open === s.key;
            const sub = summaryOf(s.key);
            return (
              <View key={s.key} style={[styles.step, isOpen && styles.stepOpen]}>
                <Pressable
                  onPress={() => {
                    animate();
                    setOpen(isOpen ? null : s.key);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: isOpen }}
                  accessibilityLabel={`Step ${i + 1}: ${s.label}${s.done ? ', done' : ''}`}
                  style={styles.stepHead}
                >
                  <View style={[styles.num, s.done && styles.numDone]}>
                    {s.done ? (
                      <Ionicons name="checkmark" size={16} color={colors.onColor} />
                    ) : (
                      <Text style={styles.numText}>{i + 1}</Text>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepTitle}>{s.label}</Text>
                    {sub && !isOpen ? (
                      <Text style={styles.stepSub} numberOfLines={1}>
                        {sub}
                      </Text>
                    ) : null}
                  </View>
                  <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                </Pressable>
                {isOpen ? <View style={styles.stepBody}>{renderStep(s.key)}</View> : null}
              </View>
            );
          })}
        </View>

        {!done && item.status !== 'later' ? (
          <Pressable onPress={keepForLater} accessibilityRole="button" style={({ pressed }) => [styles.later, pressed && { opacity: 0.7 }]}>
            <Ionicons name="time-outline" size={16} color={colors.muted} />
            <Text style={styles.laterText}>Not now? Keep it for the next round</Text>
          </Pressable>
        ) : null}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={saveNotes}
          placeholder="Anything else to remember…"
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={1000}
          multiline
          style={[styles.input, styles.multi]}
          accessibilityLabel="Notes"
        />

        <ErrorBanner message={error} />
      </Screen>

      <Toast message={toast} icon="sparkles" onHide={() => setToast('')} />
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  label: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.sm },
  subLabel: { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  help: { fontSize: 14, lineHeight: 20, color: colors.muted, marginBottom: spacing.md },

  progress: { marginBottom: spacing.md },
  progressTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  progressLabel: { fontSize: 12, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 1 },
  progressCount: { fontSize: 13, fontWeight: '700', color: colors.primary },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.primary },

  doneBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.successSoft,
  },
  doneTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  doneText: { fontSize: 13, lineHeight: 18, color: colors.text, marginTop: 2 },
  undo: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },

  steps: { gap: spacing.sm },
  later: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.md },
  laterText: { fontSize: 14, fontWeight: '600', color: colors.muted },
  step: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  stepOpen: { borderColor: colors.primary },
  stepHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md },
  num: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.border,
  },
  numDone: { backgroundColor: colors.primary, borderColor: colors.primary },
  numText: { fontSize: 13, fontWeight: '800', color: colors.muted },
  stepTitle: { fontSize: 16, fontWeight: '800', color: colors.text },
  stepSub: { fontSize: 13, color: colors.muted, marginTop: 2 },
  stepBody: { paddingHorizontal: spacing.md, paddingBottom: spacing.md },
  stepButton: { marginTop: spacing.md },

  ideas: { gap: spacing.sm },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  ideaOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  ideaIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  ideaIconOn: { backgroundColor: colors.primary },
  ideaKind: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  ideaText: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text, marginTop: 2 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  chipTextOn: { color: colors.onColor },

  pbRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  pbNum: { width: 22, fontSize: 13, fontWeight: '800', color: colors.primary, textAlign: 'center' },
  pbText: { flex: 1, fontSize: 15, lineHeight: 21, color: colors.text },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  addBtn: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },

  quote: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
  },
  quoteText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },

  input: {
    minHeight: 48,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  multi: { minHeight: 90, textAlignVertical: 'top' },
});
