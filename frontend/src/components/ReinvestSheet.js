import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import { FILL_KINDS, fillIdeas } from '../constants/fill';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// Shared by the Reinvest cards: the two ways to spend freed time, their icons, and the picking sheet.
export const KINDS = ['production', 'investment'];
export const KIND_ICONS = { production: 'briefcase', investment: 'heart' };
export const KIND_SHORT = { production: 'Business', investment: 'You' };
export const h = (n) => `${Math.round(n * 100) / 100} h`;

// An icon for an idea, by what it's about (a sparkle when nothing matches).
const IDEA_ICONS = [
  [/exercise|gym|health|walk|run|yoga|sport/i, 'barbell'],
  [/family|kids|home/i, 'home'],
  [/learn|read|course|study/i, 'book'],
  [/rest|recover|sleep|nap/i, 'bed'],
  [/think|plan|strateg|vision/i, 'bulb'],
  [/mentor|teach|coach|program|workshop|speak/i, 'school'],
  [/content|creat|writ|brand|design|creative/i, 'color-palette'],
  [/client|customer|sales|partner|deal/i, 'people'],
  [/product|idea|offer|build/i, 'rocket'],
  [/rate|price|money|revenue/i, 'cash'],
];
export const iconFor = (name) => (IDEA_ICONS.find(([re]) => re.test(name)) || [null, 'sparkles'])[1];

/** Hours you can give one fill: half-hour steps up to what's left, and "all of it". */
function hourChoices(left) {
  const list = [0.5, 1, 1.5, 2].filter((x) => x <= left + 0.001);
  if (left >= 0.25 && !list.some((x) => Math.abs(x - left) < 0.001)) list.push(Math.round(left * 100) / 100);
  return list;
}

/** A short "Nice!" strip after each reinvest: returns [cheer, setCheer]; it clears itself. */
export function useCheer() {
  const [cheer, setCheer] = useState(null);
  useEffect(() => {
    if (!cheer) return undefined;
    const t = setTimeout(() => setCheer(null), 2600);
    return () => clearTimeout(t);
  }, [cheer]);
  return [cheer, setCheer];
}

/**
 * The picking sheet: business or you (preset when opened from a bucket), an idea, the hours, then
 * Reinvest. Give it a new `key` for each opening, so it starts fresh with its content already in
 * place (the Modal slides it up whole).
 *
 * Reinvest. `left` is the free hours a day; `onSave(nextFills)` saves; `onDone(fill)` after it saved.
 */
export default function ReinvestSheet({ visible, presetKind, left, fills = [], role, schedule = [], onSave, onDone, onClose }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [kind, setKind] = useState(presetKind || null);
  const [idea, setIdea] = useState(null);
  const [typed, setTyped] = useState(''); // your own idea, typed in
  const [hours, setHours] = useState(null);
  const [saving, setSaving] = useState(false);


  const choices = hourChoices(left);
  const ideas = kind ? fillIdeas(kind, { role, schedule, fills }).slice(0, 6) : [];
  const color = (k) => colors.chart[k];
  const tick = () => Haptics.selectionAsync().catch(() => {});
  const choose = (name) => {
    setIdea(name);
    if (name && !hours) setHours(choices.length === 1 ? choices[0] : null);
  };

  const reinvest = async () => {
    if (!kind || !idea || !hours) return;
    setSaving(true);
    try {
      await onSave([...fills, { activity: idea, hours, quadrant: kind, when: null }]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onDone?.({ activity: idea, hours, kind });
      onClose();
    } catch {
      // onSave already told the user
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.avoid} pointerEvents="box-none">
      <View style={styles.sheet} accessibilityViewIsModal>
        <View style={styles.grab} />
        <Text style={styles.title}>Give {h(left)} a day a new job</Text>

        {/* Business or you */}
        <View style={styles.kinds}>
          {KINDS.map((k) => {
            const on = kind === k;
            return (
              <Pressable
                key={k}
                onPress={() => {
                  tick();
                  setKind(k);
                  setIdea(null);
                  setTyped('');
                  setHours(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected: on }}
                style={[styles.kind, on && { backgroundColor: color(k), borderColor: color(k) }]}
              >
                <Ionicons name={KIND_ICONS[k]} size={16} color={on ? '#FFFFFF' : color(k)} />
                <Text style={[styles.kindText, on && styles.textOn]}>{FILL_KINDS[k].title}</Text>
              </Pressable>
            );
          })}
        </View>

        {kind ? (
          <Animated.View key={kind} entering={FadeIn.duration(200)} style={styles.block}>
            <Text style={styles.label}>Spend it on</Text>
            {/* Ideas on one line (scroll for more), or type your own below. */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.chipsLine}>
              {ideas.map(({ name }) => {
                const on = idea === name && !typed;
                return (
                  <Pressable
                    key={name}
                    onPress={() => {
                      tick();
                      setTyped('');
                      choose(name);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && { backgroundColor: color(kind), borderColor: color(kind) }]}
                  >
                    <Ionicons name={iconFor(name)} size={14} color={on ? '#FFFFFF' : color(kind)} />
                    <Text style={[styles.chipText, on && styles.textOn]}>{name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <TextInput
              value={typed}
              onChangeText={(t) => {
                setTyped(t);
                choose(t.trim() || null);
              }}
              placeholder="Or type your own…"
              placeholderTextColor={colors.muted}
              maxLength={60}
              returnKeyType="done"
              accessibilityLabel="Your own idea"
              style={[styles.input, typed.trim() && { borderColor: color(kind) }]}
            />
          </Animated.View>
        ) : null}

        {idea ? (
          <Animated.View entering={FadeIn.duration(200)} style={styles.block}>
            <Text style={styles.label}>How long a day</Text>
            <View style={styles.chips}>
              {choices.map((x) => {
                const on = hours === x;
                return (
                  <Pressable
                    key={x}
                    onPress={() => {
                      tick();
                      setHours(x);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    style={[styles.chip, on && { backgroundColor: color(kind), borderColor: color(kind) }]}
                  >
                    <Text style={[styles.chipText, on && styles.textOn]}>{h(x)}</Text>
                  </Pressable>
                );
              })}
            </View>
          </Animated.View>
        ) : null}

        <Button title="Reinvest" icon="checkmark" onPress={reinvest} disabled={!hours || !idea} loading={saving} style={styles.button} />
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const makeStyles = (colors) => ({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(10,23,22,0.45)' },
  avoid: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.surface,
  },
  grab: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing.md },
  title: { fontSize: 20, fontWeight: '800', color: colors.text },
  kinds: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  kind: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: spacing.sm + 4, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border },
  kindText: { fontSize: 14, fontWeight: '800', color: colors.text },
  textOn: { color: '#FFFFFF', fontWeight: '800' },
  block: { marginTop: spacing.md },
  label: { fontSize: 12, fontWeight: '700', color: colors.muted, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chipsLine: { flexDirection: 'row', gap: 6, paddingRight: spacing.lg },
  input: { marginTop: spacing.sm + 2, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surfaceAlt, fontSize: 15, color: colors.text },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  button: { marginTop: spacing.lg },
});
