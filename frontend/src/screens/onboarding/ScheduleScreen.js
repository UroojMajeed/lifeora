import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import ActivityRow from '../../components/ActivityRow';
import DayComposer from '../../components/DayComposer';
import EmptyRoutine from '../../components/EmptyRoutine';
import { useOnboarding } from '../../context/OnboardingContext';
import { useHandoffs } from '../../context/HandoffsContext';
import { newActivity, stepNumber } from '../../constants/content';
import { formatHours } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

const MAX_ACTIVITIES = 30;

export default function ScheduleScreen({ navigation, route }) {
  // editing: changing your day after onboarding (from My day). Saves never move you back into onboarding.
  const editing = Boolean(route.params?.editing);
  // A new round of the Loop: the whole day gets audited again.
  const round = route.params?.round;
  const { onboarding, saveStep } = useOnboarding();
  const { handoffs, fills } = useHandoffs();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  const [items, setItems] = useState(() =>
    (onboarding?.schedule || [])
      .filter((i) => i.hours)
      .map(({ activity, hours, value, money, per, energy }) => ({ activity, hours, value, money: money ?? null, per: per || 'day', energy: energy ?? null }))
  );
  const [editingIndex, setEditingIndex] = useState(null);
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

  // Save the list as it changes (shortly after the last edit), so closing the app never loses it.
  const firstRender = useRef(true);
  const autosave = useRef(null);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return undefined;
    }
    autosave.current = setTimeout(() => {
      autosave.current = null;
      saveStep({ schedule: items }, editing ? 'done' : 'schedule').catch(() => {});
    }, 600);
    return () => clearTimeout(autosave.current);
  }, [items, saveStep, editing]);

  const totalHours = items.reduce((sum, i) => sum + i.hours, 0);

  // After onboarding, show the day as it is now: handed-off tasks marked, filled time from Fill added.
  const live = editing && !round;
  const handedOff = new Set(live ? handoffs.filter((h) => h.status === 'done').map((h) => h.activity.toLowerCase()) : []);
  const fillFor = (name) => (live ? fills.filter((f) => f.activity.toLowerCase() === name.toLowerCase()) : []);
  const newFills = live ? fills.filter((f) => !items.some((i) => i.activity.toLowerCase() === f.activity.toLowerCase())) : [];
  const badgeFor = (it) => {
    if (handedOff.has(it.activity.toLowerCase())) return { label: 'Handed off', tone: 'success' };
    const extra = fillFor(it.activity).reduce((t, f) => t + f.hours, 0);
    return extra ? { label: `+${formatHours(extra)} from Fill`, tone: 'primary' } : null;
  };
  const dayNowHours =
    items.filter((i) => !handedOff.has(i.activity.toLowerCase())).reduce((t, i) => t + i.hours, 0) +
    (live ? fills.reduce((t, f) => t + f.hours, 0) : 0);

  const openEdit = (index) => setEditingIndex((cur) => (cur === index ? null : index));

  const add = (name, hours, per = 'day') => {
    if (items.length >= MAX_ACTIVITIES) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => [...list, { ...newActivity(name, hours), per }]);
    // Like a chat: the newest one shows at the bottom of the list.
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  };

  const save = (updated) => {
    setItems((list) => list.map((it, i) => (i === editingIndex ? updated : it)));
    setEditingIndex(null);
  };

  const remove = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => list.filter((_, i) => i !== index));
    setEditingIndex(null);
  };

  const next = async () => {
    // Moving on saves the list itself; a pending autosave must not pull the step back afterwards.
    clearTimeout(autosave.current);
    setError('');
    setLoading(true);
    try {
      if (editing) {
        await saveStep({ schedule: items }, 'done');
        // Only the new activities need rating; otherwise the change is already done.
        if (unsorted) navigation.navigate('Swipe', { editing: true });
        else navigation.goBack();
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

  const over = totalHours > 24;
  const ready = items.length > 0 && !over;
  const unsorted = items.filter((i) => !i.energy).length;
  const nextTitle = round
    ? 'Next: rate your routine'
    : editing
    ? unsorted
      ? `Rate ${unsorted} new`
      : 'Save'
    : 'Next: rate your routine';

  // Shown above the suggestion cards: the day's total and the way forward.
  const action = items.length ? (
    <View style={styles.actionRow}>
      <Text style={[styles.actionTotal, over && styles.totalOver]} numberOfLines={1}>
        {over ? 'More than 24 hours a day' : `${items.length} ${items.length === 1 ? 'task' : 'tasks'} · ${formatHours(live ? dayNowHours : totalHours)} a day`}
      </Text>
      <Button
        title={nextTitle}
        icon={editing && !unsorted && !round ? 'checkmark' : 'arrow-forward'}
        onPress={next}
        loading={loading}
        disabled={!ready}
        style={styles.actionButton}
      />
    </View>
  ) : null;

  return (
    <Screen scroll={false} avoidKeyboard tinted contentStyle={{ paddingHorizontal: 0, paddingBottom: 0 }}>
      <View style={styles.body}>
        {/* Like a chat: the list scrolls with the keyboard open (it fills the space above the bar). */}
        <ScrollView
          ref={listRef}
          style={styles.list}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <StepHeader
            step={stepNumber('schedule')}
            editing={editing}
            eyebrow={round ? `Round ${round} · Audit` : editing ? 'Edit your routine' : 'Your routine'}
            title={round ? "What's in your routine now?" : "What's in your routine?"}
            subtitle={
              round
                ? 'Handed-off tasks are gone and your new work is in. Add anything new.'
                : editing
                ? 'Tap an activity to change it. Changes save as you go.'
                : 'The tasks you do on a normal work day.'
            }
          />

          {items.length ? (
            <>
              <View style={styles.rows}>
                {items.map((item, index) => (
                  <ActivityRow
                    key={item.activity}
                    item={item}
                    isActive={editingIndex === index}
                    onEdit={() => openEdit(index)}
                    onRemove={() => remove(index)}
                    badge={badgeFor(item)}
                    muted={handedOff.has(item.activity.toLowerCase())}
                  />
                ))}
              </View>
              <Text style={styles.hint}>Tap a task to change it</Text>
            </>
          ) : (
            <EmptyRoutine />
          )}

          {newFills.length ? (
            <>
              <Text style={[styles.sectionLabel, styles.fillLabel]}>New from Fill</Text>
              {newFills.map((f) => (
                <Pressable
                  key={f.activity}
                  onPress={() => navigation.navigate('Fill')}
                  accessibilityRole="button"
                  accessibilityLabel={`${f.activity}, ${formatHours(f.hours)} a day from Fill. Change it in Fill.`}
                  style={({ pressed }) => [styles.fillRow, pressed && { opacity: 0.7 }]}
                >
                  <Ionicons name="sunny-outline" size={18} color={colors.primaryDark} />
                  <Text style={styles.fillName} numberOfLines={1}>
                    {f.activity}
                  </Text>
                  <Text style={styles.fillHours}>{formatHours(f.hours)}</Text>
                  <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                </Pressable>
              ))}
              <Text style={styles.hint}>Change these in Fill. They join your routine for good at the next round.</Text>
            </>
          ) : null}

          <ErrorBanner message={error} />
        </ScrollView>

        {/* Next sits on its own above the chat sheet (hidden while typing, so the keyboard area stays clear). */}
        {!keyboardOpen ? action : null}

        {items.length < MAX_ACTIVITIES || editingIndex !== null ? (
          <DayComposer
            role={onboarding?.role}
            items={items}
            editing={editingIndex !== null ? items[editingIndex] : null}
            onAdd={add}
            onSave={save}
            onRemove={() => remove(editingIndex)}
            onCancelEdit={() => setEditingIndex(null)}
          />
        ) : null}
      </View>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  total: { fontSize: 14, fontWeight: '700', color: colors.muted },
  totalOver: { color: colors.error },
  fillLabel: { marginTop: spacing.lg, marginBottom: spacing.sm },
  fillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primarySoft,
  },
  fillName: { flex: 1, fontSize: 16, fontWeight: '600', color: colors.text },
  fillHours: { fontSize: 14, fontWeight: '700', color: colors.primaryDark },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  body: { flex: 1 },
  rows: { gap: spacing.sm + 2 },
  list: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  actionTotal: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.muted },
  actionButton: { minHeight: 44, paddingHorizontal: spacing.md },
});
