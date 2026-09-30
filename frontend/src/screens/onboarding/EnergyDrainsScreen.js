import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Chip from '../../components/Chip';
import TextField from '../../components/TextField';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { DRAINING_TASKS, stepNumber } from '../../constants/content';
import { formatMoney } from '../../utils/format';
import { colors, spacing } from '../../theme';

export default function EnergyDrainsScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const initial = onboarding?.drainingTasks || [];
  const [selected, setSelected] = useState(initial);
  const [custom, setCustom] = useState(initial.filter((t) => !DRAINING_TASKS.includes(t)));
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggle = (task) =>
    setSelected((s) => (s.includes(task) ? s.filter((t) => t !== task) : [...s, task]));

  const addCustom = () => {
    const task = draft.trim().slice(0, 60);
    if (!task) return;
    if (!custom.includes(task) && !DRAINING_TASKS.includes(task)) setCustom((c) => [...c, task]);
    if (!selected.includes(task)) setSelected((s) => [...s, task]);
    setDraft('');
  };

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      await saveStep({ drainingTasks: selected }, 'feeling');
      navigation.navigate('Feeling');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const rate = onboarding?.buybackRate;

  return (
    <Screen
      footer={
        <Button
          title={selected.length ? `Continue with ${selected.length} selected` : 'Pick at least one'}
          onPress={next}
          loading={loading}
          disabled={!selected.length}
        />
      }
    >
      <StepHeader
        step={stepNumber('energy_drains')}
        eyebrow="Audit"
        title="What drains your energy?"
        subtitle={`Pick the tasks that feel like work and pay you little. These are your first handoffs${
          rate ? `, at ${formatMoney(rate)}/hr or less` : ''
        }.`}
      />

      <View style={styles.chips}>
        {[...DRAINING_TASKS, ...custom].map((task) => (
          <Chip key={task} label={task} selected={selected.includes(task)} onPress={() => toggle(task)} />
        ))}
      </View>

      <Text style={styles.addLabel}>Something else?</Text>
      <View style={styles.addRow}>
        <TextField
          style={styles.addField}
          value={draft}
          onChangeText={setDraft}
          placeholder="e.g. Ordering supplies"
          returnKeyType="done"
          onSubmitEditing={addCustom}
          maxLength={60}
        />
        <Button title="Add" variant="secondary" onPress={addCustom} disabled={!draft.trim()} style={styles.addBtn} />
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  addLabel: { marginTop: spacing.lg, marginBottom: spacing.sm, fontSize: 14, fontWeight: '600', color: colors.text },
  addRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  addField: { flex: 1 },
  addBtn: { minHeight: 52, paddingHorizontal: spacing.md },
});
