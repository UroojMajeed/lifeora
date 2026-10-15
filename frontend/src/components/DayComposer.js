import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { suggestionsFor } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/**
 * Adding tasks to "Your routine", like a chat: type a task (or tap a suggestion) and it drops straight
 * into the list; the text box stays ready for the next one. Time is set on each task's card, not here.
 * The suggestions float above the white chat bar, so the two never look alike. While the keyboard is
 * open they're hidden (you're typing your own), so nothing moves as you type.
 */
export default function DayComposer({ role, items, onAdd }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const inputRef = useRef(null);
  const [draft, setDraft] = useState('');
  const [typing, setTyping] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setTyping(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setTyping(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const taken = (n) => items.some((i) => sameName(i.activity, n));
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));
  const canSend = Boolean(draft.trim()) && !taken(draft);
  const duplicate = Boolean(draft.trim()) && taken(draft);

  const add = (name) => {
    const clean = name.trim().slice(0, 60);
    if (!clean || taken(clean)) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onAdd(clean);
    setDraft('');
  };

  return (
    <View>
      {/* Suggestions: outlined chips on the page itself, above the chat bar (hidden while typing). */}
      {suggestions.length && !typing ? (
        <>
          <Text style={styles.label}>Suggestions</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.row}>
            {suggestions.slice(0, 12).map((n) => (
              <Pressable
                key={n}
                onPress={() => add(n)}
                accessibilityRole="button"
                accessibilityLabel={`Add ${n}`}
                style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="add" size={15} color={colors.primary} />
                <Text style={styles.chipText} numberOfLines={1}>
                  {n}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </>
      ) : null}

      {/* The chat bar: only the text box and send. */}
      <View style={styles.sheet}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={draft}
            onChangeText={setDraft}
            onSubmitEditing={() => add(draft)}
            placeholder={items.length ? 'Add another task…' : 'Type a task from your routine…'}
            placeholderTextColor={colors.muted}
            keyboardAppearance={isDark ? 'dark' : 'light'}
            maxLength={60}
            returnKeyType="send"
            blurOnSubmit={false}
            style={[styles.input, duplicate && styles.inputDuplicate]}
            accessibilityLabel={duplicate ? "Task name. That's already in your routine." : 'Task name'}
          />
          <Pressable
            onPress={() => add(draft)}
            disabled={!canSend}
            accessibilityRole="button"
            accessibilityLabel="Add task"
            style={[styles.send, !canSend && styles.sendOff]}
          >
            <Ionicons name="arrow-up" size={20} color={colors.onColor} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.muted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    marginBottom: 6,
  },
  row: { gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm + 2 },
  chip: {
    maxWidth: 220,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: 'transparent',
  },
  chipText: { fontSize: 14, fontWeight: '600', color: colors.primaryDark, flexShrink: 1 },
  sheet: {
    paddingTop: spacing.sm + 2,
    paddingBottom: spacing.sm + 2,
    gap: 6,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
    ...(isDark
      ? { borderTopWidth: 1, borderTopColor: colors.border }
      : { shadowColor: colors.shadow, shadowOpacity: 0.06, shadowRadius: 18, shadowOffset: { width: 0, height: -4 }, elevation: 8 }),
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg },
  input: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: spacing.md + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    fontSize: 16,
    color: colors.text,
  },
  send: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  sendOff: { opacity: 0.35 },
  // Already in the list: the typed text turns red (and send stays off).
  inputDuplicate: { color: colors.error },
});
