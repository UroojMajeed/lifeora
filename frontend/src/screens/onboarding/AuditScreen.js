import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import AuditTaskCard, { FIELDS, isAudited } from '../../components/AuditTaskCard';
import AuditForm from '../../components/AuditForm';
import AuditStats from '../../components/AuditStats';
import { useOnboarding } from '../../context/OnboardingContext';
import { stepNumber, valueForMoney } from '../../constants/content';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

const MAX_ACTIVITIES = 30;

/**
 * Journey step 2, "Time and energy audit", in two clean parts. First the form on one card, each
 * question opening under the last as you answer (the task, its time, its money, its energy), task
 * after task. "Done, that's my routine" then shows
 * the routine once, as a list: each card with its Time, Money and Energy buttons to change them, in
 * its DRIP quadrant's colour. From there, the full DRIP Matrix.
 */
export default function AuditScreen({ navigation, route }) {
  // A new round of the Loop (after onboarding): the whole routine gets audited again.
  const round = route.params?.round;
  const { onboarding, saveStep } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  const [items, setItems] = useState(() =>
    (onboarding?.schedule || [])
      .filter((i) => i.hours)
      .map(({ activity, hours, value, money, per, energy }) => ({ activity, hours, value, money: money ?? null, per: per || 'day', energy: energy ?? null }))
  );
  // 'form': adding tasks one question at a time. 'list': the routine, shown once it's done. Coming
  // back with tasks already there (or a new round) opens on the list.
  const [modeChoice, setMode] = useState(() => (items.length ? 'list' : 'form'));
  const mode = items.length ? modeChoice : 'form'; // no tasks left: back to the form
  const show = (m) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setMode(m);
    listRef.current?.scrollTo({ y: 0, animated: false });
  };
  // Which task's choices are open, and for which button (Time, Money or Energy).
  const firstUnset = (it) => FIELDS.find((k) => !it[k]) ?? null;
  const [open, setOpen] = useState(() => {
    const it = items.find((i) => !isAudited(i));
    return it ? { name: it.activity, field: firstUnset(it) } : null;
  });
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  const listRef = useRef(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Save as the list changes (shortly after the last edit), so closing the app never loses it.
  // Only tasks with a time are saved (the server needs one).
  const firstRender = useRef(true);
  const autosave = useRef(null);
  const saving = useRef(null);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }
    autosave.current = setTimeout(() => {
      autosave.current = null;
      saving.current = saveStep({ schedule: items.filter((i) => i.hours) }, round ? 'done' : 'schedule').catch(() => {});
    }, 600);
    return () => clearTimeout(autosave.current);
  }, [items, saveStep, round]);

  // Pressing Time, Money or Energy on a card opens its choices there (pressing it again closes them).
  const showField = (name, field) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen(field ? { name, field } : null);
  };

  // The form's "Save & add next": the finished task joins the routine list (its card closed).
  const add = (task) => {
    if (items.length >= MAX_ACTIVITIES) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => [...list, task]);
  };

  // Picking a choice: the card's next unset button opens; once all three are set, the task's dot
  // drops into the matrix and the next unfinished task opens.
  const change = (name, patch) => {
    const updated = items.map((it) =>
      it.activity === name ? { ...it, ...patch, ...(patch.money ? { value: valueForMoney(patch.money) } : null) } : it
    );
    const now = updated.find((it) => it.activity === name);
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (!isAudited(now)) setOpen({ name, field: firstUnset(now) });
    else {
      const nextTask = updated.find((it) => !isAudited(it));
      setOpen(nextTask ? { name: nextTask.activity, field: firstUnset(nextTask) } : null);
    }
    setItems(updated);
  };

  // A new name for a task (from its card). Empty or already in the list: no (the card keeps the old one).
  const rename = (oldName, newName) => {
    if (!newName || items.some((it) => it.activity !== oldName && it.activity.trim().toLowerCase() === newName.toLowerCase())) return false;
    setItems((list) => list.map((it) => (it.activity === oldName ? { ...it, activity: newName } : it)));
    setOpen((o) => (o?.name === oldName ? { ...o, name: newName } : o));
    return true;
  };

  const remove = (name) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => list.filter((it) => it.activity !== name));
  };

  const unfinished = items.filter((it) => !isAudited(it)).length;
  // The form's "Save & next" lives in the sticky bar; the form says when it can save.
  const formRef = useRef(null);
  const [formReady, setFormReady] = useState(false);
  const ready = items.length > 0 && !unfinished;

  const next = async () => {
    clearTimeout(autosave.current);
    setError('');
    setLoading(true);
    try {
      await saving.current;
      // Everything is rated already, so the rating screen opens straight on the DRIP Matrix.
      if (round) {
        await saveStep({ schedule: items }, 'done');
        navigation.navigate('Swipe', { editing: true });
        return;
      }
      await saveStep({ schedule: items }, 'swipe');
      navigation.navigate('Swipe');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false} avoidKeyboard tinted contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <View style={styles.body}>
        <ScrollView ref={listRef} style={styles.list} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <StepHeader
            step={stepNumber('schedule')}
            editing={Boolean(round)}
            eyebrow={round ? `Round ${round}` : 'Step 2 of 4'}
            title={mode === 'list' ? 'Your routine' : 'Time and energy audit'}
            subtitle={
              round
                ? 'Your routine has changed. Check how each task makes you feel now, and add anything new.'
                : mode === 'list'
                ? 'Everything you do on a normal work day.'
                : 'Add the tasks of a normal work day, one at a time.'
            }
          />
          {mode === 'form' ? (
            <>
              {/* Your totals so far, big and clear. */}
              {items.length ? <AuditStats items={items} style={styles.stats} /> : null}
              {items.length < MAX_ACTIVITIES ? (
                <AuditForm
                  ref={formRef}
                  role={onboarding?.role}
                  items={items}
                  onAdd={add}
                  onReadyChange={setFormReady}
                  onReveal={() => listRef.current?.scrollToEnd({ animated: true })}
                />
              ) : null}
            </>
          ) : (
            <>
              {/* The routine, shown once: each card can still be changed. */}
              {/* On top, so it's there without scrolling: your totals, and a way to add another task. */}
              <AuditStats items={items} style={styles.stats} />
              <View style={styles.listTop}>
                <Text style={styles.listHead}>Tap a name or a button to change it</Text>
                {items.length < MAX_ACTIVITIES ? (
                  <Pressable onPress={() => show('form')} hitSlop={8} accessibilityRole="button" style={styles.addMore}>
                    <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                    <Text style={styles.doneText}>Add another task</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.rows}>
                {items.map((item) => (
                  <AuditTaskCard
                    key={item.activity}
                    item={item}
                    field={open?.name === item.activity ? open.field : null}
                    onField={(field) => showField(item.activity, field)}
                    onChange={(patch) => change(item.activity, patch)}
                    onRename={(name) => rename(item.activity, name)}
                    onRemove={() => remove(item.activity)}
                  />
                ))}
              </View>
            </>
          )}
          <ErrorBanner message={error} />
        </ScrollView>

        {/* The sticky bar, in thumb reach (hidden while typing): Done and Save & next on the form. */}
        {mode === 'form' && !keyboardOpen ? (
          <View style={styles.bar}>
            {items.length ? (
              <Button
                title={`Done · ${items.length}`}
                icon="checkmark"
                variant="secondary"
                onPress={() => show('list')}
                style={[styles.barButton, styles.done]}
              />
            ) : null}
            <Button
              title="Save & next"
              icon="arrow-forward"
              onPress={() => formRef.current?.save()}
              disabled={!formReady}
              style={[styles.barButton, styles.barMain]}
            />
          </View>
        ) : null}

        {/* From the routine on to the DRIP Matrix (hidden while typing). */}
        {mode === 'list' && !keyboardOpen && items.length ? (
          <View style={styles.actionRow}>
            <Button
              title={ready ? 'See your DRIP Matrix' : `Finish ${unfinished} ${unfinished === 1 ? 'task' : 'tasks'}`}
              icon={ready ? 'arrow-forward' : undefined}
              onPress={next}
              loading={loading}
              disabled={!ready}
              style={styles.actionButton}
            />
          </View>
        ) : null}

      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  body: { flex: 1 },
  list: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  stats: { marginBottom: spacing.md },
  listTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm, marginBottom: spacing.sm },
  listHead: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.muted },
  // The sticky bar.
  bar: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  barButton: { minHeight: 52 },
  barMain: { flex: 1 },
  // "Done": short and outlined, so it never competes with "Save & next".
  done: { borderColor: colors.primary, paddingHorizontal: spacing.md },
  doneText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  addMore: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: spacing.xs },
  rows: { gap: spacing.sm + 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  actionButton: { minHeight: 48, paddingHorizontal: spacing.lg + 4, maxWidth: '100%' },
});
