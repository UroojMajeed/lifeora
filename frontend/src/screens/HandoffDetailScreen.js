import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Segmented from '../components/Segmented';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import Toast from '../components/Toast';
import { useHandoffs } from '../context/HandoffsContext';
import { DRIP, HANDOFF_METHODS, HANDOFF_STATUSES, handoffIdeas } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../theme';

const STATUS_OPTIONS = HANDOFF_STATUSES.map((s) => ({ key: s.key, label: s.label, color: s.color === 'muted' ? 'primary' : s.color }));
const methodInfo = (key) => HANDOFF_METHODS.find((m) => m.key === key);

/** One draining task: where it's at, ideas for buying it back (pick one as the plan), and a simple record. */
export default function HandoffDetailScreen({ route, navigation }) {
  const { activity } = route.params;
  const { handoffs, summary, update, refresh } = useHandoffs();
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const item = handoffs.find((h) => h.activity === activity);

  const [who, setWho] = useState(item?.who || '');
  const [notes, setNotes] = useState(item?.notes || '');
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  // Opened before the list loaded (e.g. straight from Home): load it. If it's loaded and the task
  // isn't there (e.g. the account was reset), go back.
  useEffect(() => {
    if (!summary) refresh();
    else if (!item) navigation.goBack();
  }, [summary, item, refresh, navigation]);

  // Keep the text fields in step once the task arrives.
  useEffect(() => {
    if (item) {
      setWho(item.who || '');
      setNotes(item.notes || '');
    }
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
  const dropping = item.method === 'drop';
  const ideas = handoffIdeas(item);

  const setStatus = async (status) => {
    if (status === item.status) return;
    Haptics.selectionAsync().catch(() => {});
    const res = await save({ status });
    if (res && status === 'done') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setToast(`You just bought back ${formatHours(item.hours)} a day.`);
    }
  };

  // Tap an idea to make it the plan; tap it again to clear it.
  const choose = (idea) => {
    Haptics.selectionAsync().catch(() => {});
    const chosen = item.plan === idea.text;
    save(chosen ? { plan: '', method: null } : { plan: idea.text, method: idea.method });
  };

  const saveText = (field, value) => {
    if ((item[field] || '') !== value.trim()) save({ [field]: value.trim() });
  };

  return (
    <View style={{ flex: 1 }}>
      <Screen
        footer={
          done ? null : (
            <Button
              title={dropping ? "I've dropped it" : 'Mark as handed off'}
              icon="checkmark-circle"
              onPress={() => setStatus('done')}
            />
          )
        }
      >
        <PageHeader eyebrow={q.name} title={item.activity} subtitle={`${formatHours(item.hours)} a day. ${q.advice}`} />

        <Text style={styles.label}>Where is it at?</Text>
        <View style={styles.row}>
          <Segmented options={STATUS_OPTIONS} value={item.status} onChange={setStatus} accessibilityLabel="Handoff status" />
        </View>

        <Text style={styles.label}>Ideas to buy it back</Text>
        <Text style={styles.help}>Tap the one you'll go with.</Text>
        <View style={styles.ideas}>
          {ideas.map((idea) => {
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
                <Ionicons
                  name={chosen ? 'checkmark-circle' : 'ellipse-outline'}
                  size={22}
                  color={chosen ? colors.primary : colors.border}
                />
              </Pressable>
            );
          })}
        </View>

        {!dropping ? (
          <>
            <Text style={styles.label}>Who's taking it?</Text>
            <TextInput
              value={who}
              onChangeText={setWho}
              onBlur={() => saveText('who', who)}
              onSubmitEditing={() => saveText('who', who)}
              placeholder={item.method === 'automate' ? 'e.g. Zapier, accounting software' : 'e.g. Ayesha, my assistant'}
              placeholderTextColor={colors.muted}
              keyboardAppearance={isDark ? 'dark' : 'light'}
              maxLength={60}
              returnKeyType="done"
              style={styles.input}
              accessibilityLabel="Who's taking it"
            />
          </>
        ) : null}

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          onBlur={() => saveText('notes', notes)}
          placeholder="Anything to remember: logins to share, how you like it done…"
          placeholderTextColor={colors.muted}
          keyboardAppearance={isDark ? 'dark' : 'light'}
          maxLength={1000}
          multiline
          style={[styles.input, styles.notes]}
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
  help: { fontSize: 13, color: colors.muted, marginTop: -4, marginBottom: spacing.sm },
  row: { flexDirection: 'row' },
  ideas: { gap: spacing.sm },
  idea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : 'transparent',
    backgroundColor: colors.surface,
    ...cardShadow(colors, isDark),
  },
  ideaOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  ideaIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  ideaIconOn: { backgroundColor: colors.primary },
  ideaKind: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.8 },
  ideaText: { fontSize: 15, lineHeight: 21, fontWeight: '600', color: colors.text, marginTop: 2 },
  input: {
    minHeight: 52,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  notes: { minHeight: 110, textAlignVertical: 'top' },
});
