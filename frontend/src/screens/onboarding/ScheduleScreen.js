import { useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import ActivityRow, { ACTIVITY_ROW_HEIGHT } from '../../components/ActivityRow';
import DraggableList from '../../components/DraggableList';
import AddActivitySheet from '../../components/AddActivitySheet';
import { useOnboarding } from '../../context/OnboardingContext';
import { newActivity, stepNumber } from '../../constants/content';
import { formatHours } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

const MAX_ACTIVITIES = 30;

export default function ScheduleScreen({ navigation, route }) {
  // editing: changing your day after onboarding (from My day). Saves never move you back into onboarding.
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  const [items, setItems] = useState(() =>
    (onboarding?.schedule || [])
      .filter((i) => i.hours)
      .map(({ activity, hours, value, energy }) => ({ activity, hours, value, energy: energy ?? null }))
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [dragging, setDragging] = useState(false);
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

  // First visit: open the picker as soon as the screen has finished sliding in, so the two
  // animations don't overlap. (If we resumed straight onto this screen there is no transition.)
  useEffect(() => {
    if (items.length) return undefined;
    let opened = false;
    const open = () => {
      if (opened) return;
      opened = true;
      setSheetOpen(true);
    };
    const unsubscribe = navigation.addListener('transitionEnd', (e) => {
      if (!e.data?.closing) open();
    });
    const fallback = setTimeout(open, 600);
    return () => {
      unsubscribe();
      clearTimeout(fallback);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHours = items.reduce((sum, i) => sum + i.hours, 0);

  const openAdd = () => {
    setEditingIndex(null);
    setSheetOpen(true);
  };

  const openEdit = (index) => {
    setEditingIndex(index);
    setSheetOpen(true);
  };

  const add = (name, hours) => {
    if (items.length >= MAX_ACTIVITIES) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => [...list, newActivity(name, hours)]);
  };

  const save = (updated) => setItems((list) => list.map((it, i) => (i === editingIndex ? updated : it)));

  const remove = (index) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setItems((list) => list.filter((_, i) => i !== index));
  };

  const next = async () => {
    // Moving on saves the list itself; a pending autosave must not pull the step back afterwards.
    clearTimeout(autosave.current);
    setError('');
    setLoading(true);
    try {
      if (editing) {
        await saveStep({ schedule: items }, 'done');
        // Only the new activities need a swipe; otherwise the change is already done.
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
  const nextTitle = editing
    ? unsorted
      ? `Next: swipe ${unsorted} new ${unsorted === 1 ? 'activity' : 'activities'}`
      : 'Save my day'
    : 'Next: swipe your day';

  return (
    <Screen
      scrollEnabled={!dragging}
      footer={
        <Button
          title={over ? 'That is more than 24 hours' : items.length ? nextTitle : 'Add your first activity'}
          icon={ready ? (editing && !unsorted ? 'checkmark' : 'arrow-forward') : undefined}
          onPress={items.length ? next : openAdd}
          loading={loading}
          disabled={over}
        />
      }
    >
      <StepHeader
        step={stepNumber('schedule')}
        editing={editing}
        eyebrow={editing ? 'Edit your day' : 'Your day'}
        title="What fills a normal day?"
        subtitle={
          editing
            ? 'Add, change or remove activities. Changes save as you go.'
            : 'Add what you do and roughly how long each takes. Order them however you like.'
        }
      />

      {items.length ? (
        <>
          <View style={styles.listHeader}>
            <Text style={styles.sectionLabel}>
              {items.length} {items.length === 1 ? 'activity' : 'activities'}
            </Text>
            <Text style={[styles.total, over && styles.totalOver]}>{formatHours(totalHours)} a day</Text>
          </View>
          <DraggableList
            items={items}
            keyOf={(it) => it.activity}
            rowHeight={ACTIVITY_ROW_HEIGHT}
            gap={spacing.sm}
            onReorder={setItems}
            onDragStart={() => setDragging(true)}
            onDragEnd={() => setDragging(false)}
            renderItem={({ item, index, isActive, Handle }) => (
              <ActivityRow
                item={item}
                isActive={isActive}
                Handle={Handle}
                onEdit={() => openEdit(index)}
                onRemove={() => remove(index)}
              />
            )}
          />
          {items.length > 1 ? <Text style={styles.hint}>Hold ≡ and drag to reorder. Tap an activity to edit it.</Text> : null}
        </>
      ) : null}

      {items.length < MAX_ACTIVITIES ? (
        <Pressable
          onPress={openAdd}
          accessibilityRole="button"
          style={({ pressed }) => [styles.addButton, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="add-circle" size={22} color={colors.primaryDark} />
          <Text style={styles.addText}>Add activity</Text>
        </Pressable>
      ) : null}

      <ErrorBanner message={error} />

      <AddActivitySheet
        visible={sheetOpen}
        role={onboarding?.role}
        items={items}
        editing={editingIndex !== null ? items[editingIndex] : null}
        onAdd={add}
        onSave={save}
        onClose={() => {
          setSheetOpen(false);
          setEditingIndex(null);
        }}
      />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  sectionLabel: { fontSize: 14, fontWeight: '700', color: colors.text },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: spacing.sm },
  total: { fontSize: 14, fontWeight: '700', color: colors.muted },
  totalOver: { color: colors.error },
  hint: { fontSize: 13, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.md,
    minHeight: 56,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  addText: { fontSize: 16, fontWeight: '700', color: colors.primaryDark },
});
