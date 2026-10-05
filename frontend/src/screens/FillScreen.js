import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import ErrorBanner from '../components/ErrorBanner';
import { Card } from '../components/Card';
import { useHandoffs } from '../context/HandoffsContext';
import { useOnboarding } from '../context/OnboardingContext';
import { FILL_KINDS, FILL_TIMES, fillIdeas, unfilledHours } from '../constants/fill';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const STEP = 0.5;
const round = (n) => Math.round(n * 100) / 100;

/** Fill: give the hours you bought back a new job, growing the business or investing in yourself. */
export default function FillScreen() {
  const { fills, summary, updateFills } = useHandoffs();
  const { onboarding } = useOnboarding();
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const [custom, setCustom] = useState({ production: '', investment: '' });
  const [error, setError] = useState('');

  const freed = summary?.boughtBackHours || 0;
  const filled = summary?.filledHours ?? fills.reduce((t, f) => t + f.hours, 0);
  const left = unfilledHours({ boughtBackHours: freed, filledHours: filled });
  const full = freed > 0 && left < 0.25;

  const save = async (next) => {
    setError('');
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    try {
      await updateFills(next);
    } catch (err) {
      setError(err.message);
    }
  };

  const add = (name, quadrant) => {
    const activity = name.trim();
    if (!activity || full) return;
    if (fills.some((f) => f.activity.toLowerCase() === activity.toLowerCase())) return;
    Haptics.selectionAsync().catch(() => {});
    save([...fills, { activity, hours: Math.min(1, left >= STEP ? Math.floor(left / STEP) * STEP : left), quadrant, when: null }]);
    setCustom((c) => ({ ...c, [quadrant]: '' }));
  };

  const change = (index, patch) => save(fills.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  const remove = (index) => save(fills.filter((_, i) => i !== index));

  const step = (index, dir) => {
    const f = fills[index];
    const max = round(f.hours + left);
    const hours = round(Math.min(max, Math.max(STEP, f.hours + dir * STEP)));
    if (hours === f.hours) return;
    Haptics.selectionAsync().catch(() => {});
    change(index, { hours });
  };

  const context = { role: onboarding?.role, schedule: onboarding?.schedule || [], fills };

  return (
    <Screen>
      <PageHeader
        eyebrow="Fill"
        title="Give your time a new job"
        subtitle={
          freed
            ? `You bought back ${formatHours(freed)} a day (${formatHours(freed * WORKDAYS_PER_WEEK)} a week). Freed time only counts when it goes to work you love.`
            : 'Hand off a draining task first. The hours you free up land here.'
        }
      />

      {freed ? (
        <Card>
          <View style={styles.meterTop}>
            <Text style={styles.meterBig}>
              {formatHours(filled)}
              <Text style={styles.meterOf}> of {formatHours(freed)} a day filled</Text>
            </Text>
            {full ? <Ionicons name="checkmark-circle" size={24} color={colors.success} /> : null}
          </View>
          <View style={styles.track}>
            <View style={[styles.fill, { width: `${Math.min(100, (filled / freed) * 100)}%` }]} />
          </View>
          <Text style={styles.meterNote}>
            {full ? 'Every freed hour has a job. Protect them like meetings.' : `${formatHours(left)} a day still free to give a job.`}
          </Text>
        </Card>
      ) : null}

      {fills.length ? (
        <>
          <Text style={styles.section}>Your fills</Text>
          <View style={styles.list}>
            {fills.map((f, i) => {
              const kind = FILL_KINDS[f.quadrant];
              return (
                <Card key={f.activity} style={styles.fillCard}>
                  <View style={styles.fillTop}>
                    <View style={[styles.kindIcon, { backgroundColor: colors[`${kind.color}Soft`] }]}>
                      <Ionicons name={kind.icon} size={16} color={colors[kind.color]} />
                    </View>
                    <Text style={styles.fillName} numberOfLines={1}>
                      {f.activity}
                    </Text>
                    <Pressable onPress={() => remove(i)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`Remove ${f.activity}`}>
                      <Ionicons name="close" size={20} color={colors.muted} />
                    </Pressable>
                  </View>
                  <View style={styles.fillRow}>
                    <View style={styles.stepper}>
                      <Pressable onPress={() => step(i, -1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="Less time" style={styles.stepBtn}>
                        <Ionicons name="remove" size={18} color={colors.primaryDark} />
                      </Pressable>
                      <Text style={styles.stepValue}>{formatHours(f.hours)}/day</Text>
                      <Pressable onPress={() => step(i, 1)} hitSlop={6} accessibilityRole="button" accessibilityLabel="More time" style={styles.stepBtn}>
                        <Ionicons name="add" size={18} color={colors.primaryDark} />
                      </Pressable>
                    </View>
                    <View style={styles.times}>
                      {FILL_TIMES.map((t) => {
                        const on = f.when === t.key;
                        return (
                          <Pressable
                            key={t.key}
                            onPress={() => change(i, { when: on ? null : t.key })}
                            accessibilityRole="radio"
                            accessibilityState={{ checked: on }}
                            accessibilityLabel={t.label}
                            style={[styles.time, on && styles.timeOn]}
                          >
                            <Ionicons name={t.icon} size={16} color={on ? colors.onColor : colors.muted} />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  {f.when ? <Text style={styles.whenText}>{FILL_TIMES.find((t) => t.key === f.when).label}</Text> : null}
                </Card>
              );
            })}
          </View>
        </>
      ) : null}

      {freed && !full
        ? ['production', 'investment'].map((q) => {
            const kind = FILL_KINDS[q];
            const ideas = fillIdeas(q, context);
            return (
              <View key={q}>
                <Text style={styles.section}>{kind.title}</Text>
                <Text style={styles.help}>{kind.help}</Text>
                <View style={styles.chips}>
                  {ideas.map(({ name, yours }) => (
                    <Pressable key={name} onPress={() => add(name, q)} accessibilityRole="button" style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
                      <Ionicons name={yours ? 'add-circle' : 'add'} size={15} color={colors.primaryDark} />
                      <Text style={styles.chipText}>
                        {yours ? `More ${name.toLowerCase()}` : name}
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.addRow}>
                  <TextInput
                    value={custom[q]}
                    onChangeText={(t) => setCustom((c) => ({ ...c, [q]: t }))}
                    onSubmitEditing={() => add(custom[q], q)}
                    placeholder="Something else"
                    placeholderTextColor={colors.muted}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    maxLength={60}
                    returnKeyType="done"
                    style={styles.input}
                    accessibilityLabel={`Add your own: ${kind.title}`}
                  />
                  <Pressable
                    onPress={() => add(custom[q], q)}
                    disabled={!custom[q].trim()}
                    accessibilityRole="button"
                    accessibilityLabel="Add"
                    style={[styles.addBtn, !custom[q].trim() && { opacity: 0.4 }]}
                  >
                    <Ionicons name="add" size={22} color={colors.onColor} />
                  </Pressable>
                </View>
              </View>
            );
          })
        : null}

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  meterTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  meterBig: { fontSize: 24, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  meterOf: { fontSize: 14, fontWeight: '600', color: colors.muted, letterSpacing: 0 },
  track: { height: 8, borderRadius: radius.pill, backgroundColor: colors.border, overflow: 'hidden', marginTop: spacing.sm },
  fill: { height: '100%', borderRadius: radius.pill, backgroundColor: colors.success },
  meterNote: { fontSize: 13, color: colors.muted, marginTop: spacing.sm },
  section: { fontSize: 14, fontWeight: '800', color: colors.text, marginTop: spacing.lg, marginBottom: spacing.xs },
  help: { fontSize: 13, lineHeight: 19, color: colors.muted, marginBottom: spacing.sm },
  list: { gap: spacing.sm, marginTop: spacing.sm },
  fillCard: { padding: spacing.md },
  fillTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  kindIcon: { width: 30, height: 30, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  fillName: { flex: 1, fontSize: 16, fontWeight: '800', color: colors.text },
  fillRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.md },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  stepBtn: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  stepValue: { minWidth: 64, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.text },
  times: { flexDirection: 'row', gap: 6 },
  time: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border },
  timeOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  whenText: { fontSize: 12, color: colors.muted, marginTop: spacing.xs, textAlign: 'right' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.text },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  input: {
    flex: 1,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  addBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
});
