import { useState } from 'react';
import { LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { MAX_PLAN_STEPS, STEP_INFO, STEP_PICKS, defaultSteps, isFinish, newStepId } from '../constants/journey';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

/**
 * Making a handoff plan yours: rename a step (tap its name), move it up or down, delete it, or add
 * your own (typed, or a quick pick). The last step finishes the handoff, so it stays last and can't
 * be deleted (you can still rename it). Ticked steps stay ticked. `onSave(steps)` confirms the plan;
 * `onCancel` (when editing a confirmed plan) leaves it as it was.
 */
export default function PlanEditor({ initial, method, editing, saving, onSave, onCancel }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [steps, setSteps] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const last = steps.length - 1;
  const tick = () => Haptics.selectionAsync().catch(() => {});
  const change = (next) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSteps(next);
  };

  const rename = (id, title) => setSteps((list) => list.map((s) => (s.id === id ? { ...s, title } : s)));
  const move = (i, d) => {
    tick();
    const next = [...steps];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    change(next);
  };
  const remove = (i) => {
    tick();
    change(steps.filter((_, j) => j !== i));
  };
  // A new step goes just before the finishing one.
  const add = (title) => {
    const t = title.trim().slice(0, 40);
    if (!t || steps.length >= MAX_PLAN_STEPS) return;
    tick();
    change([...steps.slice(0, last), { id: newStepId(), kind: 'custom', title: t, done: false }, steps[last]]);
    setName('');
    setAdding(false);
  };
  // The suggested steps again, keeping the ticks of any you've already done.
  const reset = () => {
    const ticked = new Set(steps.filter((s) => s.done).map((s) => s.kind));
    change(defaultSteps(method).map((s) => ({ ...s, done: ticked.has(s.kind) })));
  };
  const confirm = () => onSave(steps.map((s) => ({ ...s, title: s.title.trim() || STEP_INFO[s.kind]?.title || 'My step' })));

  const picks = STEP_PICKS.filter((p) => !steps.some((s) => s.title.toLowerCase() === p.toLowerCase()));
  const full = steps.length >= MAX_PLAN_STEPS;

  return (
    <View>
      <Text style={styles.title}>{editing ? 'Edit your plan' : 'Your plan'}</Text>
      <Text style={styles.sub}>{editing ? 'Change the steps, then save.' : 'Make the steps yours, then confirm.'}</Text>

      <View style={styles.list}>
        {steps.map((s, i) => {
          const finish = i === last && isFinish(s);
          return (
            <View key={s.id} style={styles.row}>
              <View style={[styles.num, s.done && styles.numDone]}>
                {s.done ? <Ionicons name="checkmark" size={14} color={colors.onColor} /> : <Text style={styles.numText}>{i + 1}</Text>}
              </View>
              <View style={styles.main}>
                <TextInput
                  value={s.title}
                  onChangeText={(t) => rename(s.id, t)}
                  maxLength={40}
                  style={styles.name}
                  accessibilityLabel={`Step ${i + 1} name`}
                  returnKeyType="done"
                />
                <Text style={[styles.tag, s.kind === 'custom' && styles.tagYours]}>
                  {s.done ? 'Done' : s.kind === 'custom' ? 'Your step' : 'Suggested'}
                </Text>
              </View>
              {finish ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={11} color={colors.muted} />
                  <Text style={styles.lockText}>Finishes it</Text>
                </View>
              ) : (
                <>
                  <Icon name="chevron-up" label="Move up" disabled={i === 0} onPress={() => move(i, -1)} />
                  <Icon name="chevron-down" label="Move down" disabled={i >= last - 1} onPress={() => move(i, 1)} />
                  <Icon name="close" label="Delete step" onPress={() => remove(i)} />
                </>
              )}
            </View>
          );
        })}

        {adding ? (
          <View style={styles.add}>
            <View style={styles.addHead}>
              <TextInput
                value={name}
                onChangeText={setName}
                onSubmitEditing={() => add(name)}
                placeholder="Name your step"
                placeholderTextColor={colors.muted}
                maxLength={40}
                autoFocus
                returnKeyType="done"
                style={styles.addInput}
              />
              <Pressable onPress={() => add(name)} disabled={!name.trim()} style={[styles.addBtn, !name.trim() && styles.off]} accessibilityRole="button">
                <Text style={styles.addBtnText}>Add</Text>
              </Pressable>
            </View>
            {picks.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chips}>
                {picks.map((p) => (
                  <Pressable key={p} onPress={() => add(p)} style={styles.chip} accessibilityRole="button" accessibilityLabel={`Add ${p}`}>
                    <Ionicons name="add" size={14} color={colors.muted} />
                    <Text style={styles.chipText}>{p}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
          </View>
        ) : (
          <Pressable onPress={() => setAdding(true)} disabled={full} style={[styles.addRow, full && styles.off]} accessibilityRole="button">
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addRowText}>{full ? `Up to ${MAX_PLAN_STEPS} steps` : 'Add a step'}</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.foot}>
        <Text style={styles.count}>{steps.length} steps</Text>
        <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
          <Text style={styles.link}>Reset to suggested</Text>
        </Pressable>
      </View>

      <Button title={editing ? 'Save my plan' : 'Confirm my plan'} icon="arrow-forward" loading={saving} onPress={confirm} style={styles.confirm} />
      {onCancel ? (
        <Pressable onPress={onCancel} hitSlop={8} style={styles.cancel} accessibilityRole="button">
          <Text style={styles.link}>Cancel</Text>
        </Pressable>
      ) : null}
    </View>
  );

  function Icon({ name: icon, label, disabled, onPress }) {
    return (
      <Pressable onPress={onPress} disabled={disabled} hitSlop={4} accessibilityRole="button" accessibilityLabel={label} style={[styles.icon, disabled && styles.off]}>
        <Ionicons name={icon} size={17} color={colors.muted} />
      </Pressable>
    );
  }
}

const makeStyles = (colors) => ({
  title: { fontSize: 20, fontWeight: '800', color: colors.text, marginTop: spacing.lg },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  list: { gap: spacing.sm, marginTop: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, paddingLeft: spacing.sm + 2, paddingRight: 4, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  num: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  numDone: { backgroundColor: colors.primary },
  numText: { fontSize: 12, fontWeight: '800', color: colors.primary },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text, padding: 0 },
  tag: { fontSize: 11, fontWeight: '700', color: colors.muted, marginTop: 1 },
  tagYours: { color: colors.accentText },
  icon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  off: { opacity: 0.3 },
  lock: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingRight: spacing.sm },
  lockText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingVertical: spacing.sm },
  addRowText: { fontSize: 15, fontWeight: '800', color: colors.primary },
  add: { gap: spacing.sm, padding: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.borderStrong },
  addHead: { flexDirection: 'row', gap: 6 },
  addInput: { flex: 1, minHeight: 42, paddingHorizontal: spacing.sm + 2, borderRadius: 10, borderWidth: 1.5, borderColor: colors.borderStrong, backgroundColor: colors.surface, fontSize: 15, color: colors.text },
  addBtn: { justifyContent: 'center', paddingHorizontal: spacing.md, borderRadius: 10, backgroundColor: colors.primary },
  addBtnText: { fontSize: 14, fontWeight: '800', color: colors.onColor },
  chips: { gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 11, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  foot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  count: { fontSize: 12, color: colors.muted },
  link: { fontSize: 14, fontWeight: '800', color: colors.primary },
  confirm: { marginTop: spacing.lg },
  cancel: { alignSelf: 'center', marginTop: spacing.md, paddingVertical: spacing.xs },
});
