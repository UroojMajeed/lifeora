import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import PageHeader from '../../components/PageHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import AuditTaskCard, { FIELDS, isAudited } from '../../components/AuditTaskCard';
import AuditForm from '../../components/AuditForm';
import AuditStats from '../../components/AuditStats';
import DayBar from '../../components/DayBar';
import { useOnboarding } from '../../context/OnboardingContext';
import { useHandoffs } from '../../context/HandoffsContext';
import { stepNumber, valueForMoney } from '../../constants/content';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

const MAX_ACTIVITIES = 30;

/**
 * Journey step 2, "Time and energy audit", in two clean parts. First the form on one card, each
 * question opening under the last as you answer (the task, its time, its money, its energy), task
 * after task. "Done, that's my routine" then shows
 * the routine once, as a list: each card with its Time, Money and Energy buttons to change them, in
 * its DRIP quadrant's colour. From there, the full DRIP Matrix.
 */
export default function AuditScreen({ navigation, route, inTab = false }) {
  // A new round of the Loop (after onboarding): the whole routine gets audited again.
  const round = route.params?.round;
  // The Routine tab: the same list, edited the same way, without the onboarding step around it.
  const { onboarding, saveStep } = useOnboarding();
  const { refresh: refreshHandoffs } = useHandoffs();
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
  // The keyboard simply slides over the bottom of the screen: the page never resizes for it, so nothing
  // jumps. Its height only makes room at the end of the list, so a card being renamed can scroll above it.
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', (e) =>
      setKeyboardHeight(e?.endCoordinates?.height || 0)
    );
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  // Where each card sits in the list, so the one being renamed can be scrolled into view.
  const rowsY = useRef(0);
  const cardY = useRef({});
  const bringIntoView = (name) => {
    setTimeout(() => {
      const y = rowsY.current + (cardY.current[name] || 0);
      listRef.current?.scrollTo({ y: Math.max(0, y - 120), animated: true });
    }, 250);
  };
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
      saving.current = saveStep({ schedule: items.filter((i) => i.hours) }, round || inTab ? 'done' : 'schedule')
        // In the tab, what drains you (and so your handoffs) follows the routine.
        .then(() => (inTab ? refreshHandoffs() : null))
        .catch(() => {});
    }, 600);
    return () => clearTimeout(autosave.current);
  }, [items, saveStep, round, inTab, refreshHandoffs]);

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
    // The screen stays still while you type (the keyboard slides over the bottom; nothing is lifted or resized).
    <Screen scroll={false} tinted={!inTab} edges={inTab ? ['top'] : undefined} contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <View style={styles.body}>
        <ScrollView ref={listRef} style={styles.list} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {inTab ? (
            <PageHeader eyebrow="Routine" title="Your Routine" subtitle="Everything you do on a normal work day." />
          ) : (
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
                : 'Add your work tasks, one at a time.'
            }
          />
          )}
          {mode === 'form' ? (
            <>
              {/* Your totals so far, big and clear. */}
              {/* Your day, filling up as you add tasks. */}
              <DayBar items={items} style={styles.stats} />
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
              {/* Save & next, right under the task it saves. */}
              {items.length < MAX_ACTIVITIES ? (
                <Button
                  title="Save & next"
                  icon="arrow-forward"
                  onPress={() => formRef.current?.save()}
                  disabled={!formReady}
                  style={styles.saveNext}
                />
              ) : null}
            </>
          ) : (
            <>
              {/* The routine, shown once: each card can still be changed. */}
              {/* On top, so it's there without scrolling: your totals, and a way to add another task. */}
              <AuditStats items={items} style={styles.stats} />
              <View style={styles.listTop}>
                {items.length < MAX_ACTIVITIES ? (
                  <Pressable
                    onPress={() => show('form')}
                    hitSlop={6}
                    accessibilityRole="button"
                    style={({ pressed }) => [styles.addMore, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
                  >
                    <Ionicons name="add" size={18} color={colors.primary} />
                    <Text style={styles.doneText}>Add another task</Text>
                  </Pressable>
                ) : null}
              </View>
              <View style={styles.rows} onLayout={(e) => (rowsY.current = e.nativeEvent.layout.y)}>
                {items.map((item) => (
                  <View key={item.activity} onLayout={(e) => (cardY.current[item.activity] = e.nativeEvent.layout.y)}>
                    <AuditTaskCard
                      item={item}
                      field={open?.name === item.activity ? open.field : null}
                      onField={(field) => showField(item.activity, field)}
                      onChange={(patch) => change(item.activity, patch)}
                      onRename={(name) => rename(item.activity, name)}
                      onEditStart={() => bringIntoView(item.activity)}
                      onRemove={() => remove(item.activity)}
                    />
                  </View>
                ))}
              </View>
            </>
          )}
          <ErrorBanner message={error} />
          {/* Room under the list while the keyboard is up (invisible; it doesn't move anything). */}
          {keyboardHeight ? <View style={{ height: keyboardHeight }} /> : null}
        </ScrollView>

        {/* Done, on the lower right once there's a task (it stays put; the keyboard covers it while you type). */}
        {mode === 'form' && items.length ? (
          <View style={styles.bar}>
            <Button
              title={`Done · ${items.length}`}
              icon="checkmark-circle"
              iconColor={colors.success}
              variant="secondary"
              size="small"
              onPress={() => show('list')}
              style={[styles.barButton, styles.done]}
            />
          </View>
        ) : null}

        {/* From the routine on to the DRIP Matrix (it stays put; the keyboard covers it while you type). */}
        {mode === 'list' && items.length && !inTab ? (
          <View style={styles.actionRow}>
            <Button
              title={ready ? 'See what drains you' : `Finish ${unfinished} ${unfinished === 1 ? 'task' : 'tasks'}`}
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
  listTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginBottom: spacing.sm },
  // The sticky bar.
  saveNext: { marginTop: spacing.md, minHeight: 52 },
  bar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  barButton: {},
  // "Done": short and outlined, on the right, so it never competes with "Save & next".
  done: { borderColor: colors.primary, paddingHorizontal: spacing.md },
  doneText: { fontSize: 14, fontWeight: '800', color: colors.primary },
  // A small outlined pill: clearly a button, quieter than See what drains you.
  addMore: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  rows: { gap: spacing.sm + 2 },
  // The same full-width button as every onboarding step's footer.
  actionRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  actionButton: { width: '100%' },
});
