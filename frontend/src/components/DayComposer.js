import { useEffect, useRef, useState } from 'react';
import { Keyboard, LayoutAnimation, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { HOUR_OPTIONS, WEEK_HOUR_OPTIONS, hoursLabel, perWorkday, suggestionsFor, usualHours, weeklyOf } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const animate = () => LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);

/**
 * The bottom bar of "Your routine", like a chat: suggestion cards above a text box that stays at the
 * bottom (it rides up with the keyboard). Pick or type an activity → pick its hours → it's added.
 * With `editing` set (an activity tapped in the list), the same bar renames it, changes its hours or removes it.
 */
export default function DayComposer({ role, items, editing, onAdd, onSave, onRemove, onCancelEdit, action }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const inputRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(null); // name waiting for its hours
  const [per, setPer] = useState('day'); // weekly tasks: pick hours a week instead

  // Tapping an activity in the list loads it here.
  useEffect(() => {
    animate();
    if (editing) {
      setPending(editing.activity);
      setDraft(editing.activity);
      setPer(editing.per || 'day');
    } else {
      setPer('day');
      setPending(null);
      setDraft('');
    }
  }, [editing]);

  const taken = (n) => items.some((i) => i !== editing && sameName(i.activity, n));
  const query = draft.trim().toLowerCase();
  const suggestions = suggestionsFor(role)
    .filter((n) => !taken(n))
    .filter((n) => !query || n.toLowerCase().includes(query));
  const typedIsNew = Boolean(draft.trim()) && !taken(draft) && !suggestions.some((n) => sameName(n, draft));

  const choose = (name) => {
    const clean = name.trim().slice(0, 60);
    if (!clean || taken(clean)) return;
    Haptics.selectionAsync().catch(() => {});
    Keyboard.dismiss();
    animate();
    setPending(clean);
    setDraft('');
    setPer('day');
  };

  const pickHours = (picked) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    animate();
    const h = per === 'week' ? perWorkday(picked) : picked; // always saved per workday
    if (editing) {
      const name = draft.trim() && !taken(draft) ? draft.trim().slice(0, 60) : editing.activity;
      onSave({ ...editing, activity: name, hours: h, per });
    } else {
      onAdd(pending, h, per);
    }
    setPending(null);
    setDraft('');
  };

  const cancel = () => {
    animate();
    setPending(null);
    setDraft('');
    if (editing) onCancelEdit();
  };

  const usual = pending ? usualHours(pending) : null;
  // The highlighted choice: the task's current time, in the unit shown.
  const current = editing ? (per === 'week' ? weeklyOf(editing) : editing.hours) : null;
  const options = per === 'week' ? WEEK_HOUR_OPTIONS : HOUR_OPTIONS;
  const optionLabel = (h) => (per === 'week' ? `${h}h` : hoursLabel(h));

  return (
    <View style={styles.wrap}>
      {pending ? (
        // Step 2: how long does it take?
        <View style={styles.panel}>
          <View style={styles.panelTop}>
            <Text style={styles.question} numberOfLines={2}>
              {editing ? `Change ${editing.activity}` : `How long does ${pending} take?`}
            </Text>
            <Pressable onPress={cancel} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel">
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
          <View style={styles.perRow}>
            {[
              { key: 'day', label: 'Per day' },
              { key: 'week', label: 'Per week' },
            ].map((o) => (
              <Pressable
                key={o.key}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  animate();
                  setPer(o.key);
                }}
                accessibilityRole="radio"
                accessibilityState={{ checked: per === o.key }}
                style={[styles.per, per === o.key && styles.perOn]}
              >
                <Text style={[styles.perText, per === o.key && styles.perTextOn]}>{o.label}</Text>
              </Pressable>
            ))}
          </View>
          {usual && !editing && per === 'day' ? <Text style={styles.hint}>The highlighted time is usual for most people.</Text> : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
            {options.map((h) => {
              const on = h === current || (!current && per === 'day' && h === usual);
              return (
                <Pressable
                  key={h}
                  onPress={() => pickHours(h)}
                  accessibilityRole="button"
                  accessibilityLabel={`${optionLabel(h)} ${per === 'week' ? 'a week' : 'a day'}`}
                  style={({ pressed }) => [styles.hour, on && styles.hourOn, pressed && { opacity: 0.7 }]}
                >
                  <Text style={[styles.hourText, on && styles.hourTextOn]}>{optionLabel(h)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
          {editing ? (
            <Pressable
              onPress={() => {
                animate();
                onRemove(editing);
              }}
              accessibilityRole="button"
              style={styles.remove}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={styles.removeText}>Remove from my routine</Text>
            </Pressable>
          ) : null}
        </View>
      ) : (
        // Step 1: suggestion cards (filtered by what's typed).
        <>
          {action}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
            {typedIsNew ? (
              <Pressable onPress={() => choose(draft)} accessibilityRole="button" style={[styles.card, styles.cardNew]}>
                <Ionicons name="add" size={16} color={colors.onColor} />
                <Text style={styles.cardNewText} numberOfLines={1}>
                  Add “{draft.trim()}”
                </Text>
              </Pressable>
            ) : null}
            {suggestions.slice(0, 12).map((n) => {
              const h = usualHours(n);
              return (
                <Pressable
                  key={n}
                  onPress={() => choose(n)}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${n}`}
                  style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}
                >
                  <Text style={styles.cardName} numberOfLines={1}>
                    {n}
                  </Text>
                  {h ? <Text style={styles.cardHours}>~{hoursLabel(h)}</Text> : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* The text box: always at the bottom, like a chat. */}
      <View style={styles.inputRow}>
        <TextInput
          ref={inputRef}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={() => (editing ? null : choose(draft))}
          placeholder={editing ? 'Rename it (optional)' : items.length ? 'Add another task…' : 'Add a task from your routine…'}
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={60}
          returnKeyType={editing ? 'done' : 'send'}
          blurOnSubmit={false}
          style={styles.input}
          accessibilityLabel="Activity name"
        />
        {!editing ? (
          <Pressable
            onPress={() => choose(draft)}
            disabled={!draft.trim() || taken(draft)}
            accessibilityRole="button"
            accessibilityLabel="Add"
            style={[styles.send, (!draft.trim() || taken(draft)) && styles.sendOff]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onColor} />
          </Pressable>
        ) : null}
      </View>
      {draft.trim() && taken(draft) ? <Text style={styles.warn}>That's already in your routine.</Text> : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  wrap: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg },
  card: {
    minWidth: 112,
    maxWidth: 180,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: isDark ? colors.border : 'transparent',
    ...cardShadow(colors, isDark),
  },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardHours: { fontSize: 12, color: colors.muted, marginTop: 2 },
  cardNew: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, borderColor: colors.primary },
  cardNewText: { fontSize: 14, fontWeight: '700', color: colors.onColor, flexShrink: 1 },
  panel: { gap: spacing.sm },
  panelTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  question: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  hint: { fontSize: 13, color: colors.muted, paddingHorizontal: spacing.lg, marginTop: -4 },
  hour: {
    minWidth: 64,
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  hourOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  hourText: { fontSize: 15, fontWeight: '700', color: colors.text },
  hourTextOn: { color: colors.primaryDark },
  perRow: { flexDirection: 'row', gap: 6, paddingHorizontal: spacing.lg },
  per: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  perOn: { backgroundColor: colors.primary },
  perText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  perTextOn: { color: colors.onColor },
  remove: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginLeft: spacing.lg, paddingVertical: 4 },
  removeText: { fontSize: 14, fontWeight: '700', color: colors.error },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 16,
    color: colors.text,
  },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendOff: { opacity: 0.35 },
  warn: { fontSize: 13, color: colors.error, paddingHorizontal: spacing.lg },
});
