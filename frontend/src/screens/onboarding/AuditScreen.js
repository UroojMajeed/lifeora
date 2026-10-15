import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Platform, ScrollView, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import AuditTaskCard, { isAudited } from '../../components/AuditTaskCard';
import DayComposer from '../../components/DayComposer';
import EmptyRoutine from '../../components/EmptyRoutine';
import { useOnboarding } from '../../context/OnboardingContext';
import { newActivity, stepNumber, valueForMoney } from '../../constants/content';
import { useStyles } from '../../theme/ThemeContext';
import { spacing } from '../../theme';

const MAX_ACTIVITIES = 30;

/**
 * Journey step 2, "Time and energy audit", all in one place: add tasks like a chat (type one or tap a
 * suggestion) and set each one's time, money and energy right on its card. A finished card folds to
 * one line and the next unfinished one opens. Continue leads to the DRIP Matrix.
 */
export default function AuditScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const styles = useStyles(makeStyles);

  const [items, setItems] = useState(() =>
    (onboarding?.schedule || [])
      .filter((i) => i.hours)
      .map(({ activity, hours, value, money, per, energy }) => ({ activity, hours, value, money: money ?? null, per: per || 'day', energy: energy ?? null }))
  );
  // The card that's open: the first task still missing something.
  const [openName, setOpenName] = useState(() => items.find((i) => !isAudited(i))?.activity ?? null);
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
      saving.current = saveStep({ schedule: items.filter((i) => i.hours) }, 'schedule').catch(() => {});
    }, 600);
    return () => clearTimeout(autosave.current);
  }, [items, saveStep]);

  const toggle = (name) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenName((cur) => (cur === name ? null : name));
  };

  // A new task joins the list straight away with its card open.
  const add = (name) => {
    if (items.length >= MAX_ACTIVITIES) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => [...list, { ...newActivity(name, null), per: 'day' }]);
    setOpenName(name);
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 150);
  };

  // Picking on a card; once all three are set, it folds and the next unfinished task opens.
  const change = (name, patch) => {
    const updated = items.map((it) =>
      it.activity === name ? { ...it, ...patch, ...(patch.money ? { value: valueForMoney(patch.money) } : null) } : it
    );
    const now = updated.find((it) => it.activity === name);
    if (isAudited(now)) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setOpenName(updated.find((it) => !isAudited(it))?.activity ?? null);
    }
    setItems(updated);
  };

  const remove = (name) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => list.filter((it) => it.activity !== name));
  };

  const unfinished = items.filter((it) => !isAudited(it)).length;
  const ready = items.length > 0 && !unfinished;

  const next = async () => {
    clearTimeout(autosave.current);
    setError('');
    setLoading(true);
    try {
      await saving.current;
      // Everything is rated already, so the rating screen opens straight on the DRIP Matrix.
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
            eyebrow="Step 2 of 4"
            title="Time and energy audit"
            subtitle="Add your tasks, then set each one's time, money and energy."
          />
          {items.length ? (
            <View style={styles.rows}>
              {items.map((item) => (
                <AuditTaskCard
                  key={item.activity}
                  item={item}
                  open={openName === item.activity}
                  onToggle={() => toggle(item.activity)}
                  onChange={(patch) => change(item.activity, patch)}
                  onRemove={() => remove(item.activity)}
                />
              ))}
            </View>
          ) : (
            <EmptyRoutine />
          )}
          <ErrorBanner message={error} />
        </ScrollView>

        {/* The way on, on its own above the chat bar (hidden while typing). */}
        {!keyboardOpen && items.length ? (
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

        {items.length < MAX_ACTIVITIES ? <DayComposer role={onboarding?.role} items={items} onAdd={add} /> : null}
      </View>
    </Screen>
  );
}

const makeStyles = () => ({
  body: { flex: 1 },
  list: { flex: 1 },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.lg, flexGrow: 1 },
  rows: { gap: spacing.sm + 2 },
  actionRow: { flexDirection: 'row', justifyContent: 'center', paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: spacing.md },
  actionButton: { minHeight: 48, paddingHorizontal: spacing.lg + 4, maxWidth: '100%' },
});
