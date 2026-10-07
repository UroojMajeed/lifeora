import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import DripGraph from '../../components/DripGraph';
import SwipeRateCard from '../../components/SwipeRateCard';
import { useOnboarding } from '../../context/OnboardingContext';
import { DRIP, stepNumber, summarizeSchedule, valueForMoney } from '../../constants/content';
import { recordMove } from '../../storage/progress';
import { formatHours } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

/**
 * Rate your day: for each activity, how much money it makes ($ to $$$$$) and whether it drains or
 * energizes you. Every rating drops a dot onto the DRIP graph above, so the matrix builds in front
 * of you. Tap any dot to change it. Also used after onboarding (`editing`: rate new activities) and
 * at the start of a new round (`round`: rate the whole day again).
 */
export default function SwipeScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, complete } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);

  const [items, setItems] = useState(() =>
    (onboarding?.schedule || []).map(({ activity, hours, value, money, energy }) => ({
      activity,
      hours,
      value,
      money: money ?? null,
      energy: energy ?? null,
    }))
  );
  // After onboarding only the new (unswiped) activities need rating; during onboarding every one needs both.
  const needsRating = useCallback((it) => (editing ? !it.energy : !it.energy || !it.money), [editing]);
  const [selected, setSelected] = useState(null); // an activity tapped on the graph, to change it
  const current = selected ?? items.find(needsRating)?.activity ?? null;
  const item = items.find((it) => it.activity === current) || null;

  // The card's answers so far. A new card starts from what's saved (e.g. last round's $ rating).
  const [draft, setDraft] = useState({ for: null, money: null, energy: null });
  if (item && draft.for !== item.activity) {
    setDraft({ for: item.activity, money: item.money, energy: item.energy });
  }

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const persist = (list) => {
    saveStep({ schedule: list }, editing ? 'done' : 'swipe').catch((err) => setError(err.message));
  };

  const commit = (next) => {
    if (!item || !next.money || !next.energy) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const list = items.map((it) =>
      it.activity === item.activity ? { ...it, money: next.money, value: valueForMoney(next.money), energy: next.energy } : it
    );
    setItems(list);
    setSelected(null);
    persist(list);
  };

  const [nudge, setNudge] = useState(false);
  const pickMoney = (money) => {
    setNudge(false);
    setDraft((d) => ({ ...d, money }));
  };

  // Back: reopen the activity rated just before this one.
  const index = item ? items.indexOf(item) : -1;
  const previous = index > 0 ? items[index - 1] : null;

  const left = items.filter(needsRating).length;
  const done = !item;
  const rated = items.filter((it) => it.energy);
  const summary = summarizeSchedule(
    rated.map((it) => ({ ...it, value: it.money ? valueForMoney(it.money) : it.value })),
    onboarding?.buybackRate
  );
  const zone = summary.dominant ? DRIP[summary.dominant] : null;

  const finish = async () => {
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await saveStep({ schedule: items }, 'done');
        recordMove();
        navigation.popTo('Main');
        return;
      }
      await saveStep({ schedule: items }, 'drip');
      await complete();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  const card = done ? (
    <View style={styles.card}>
      <View style={styles.doneRow}>
        <Ionicons name="checkmark-circle" size={26} color={colors.success} />
        <View style={{ flex: 1 }}>
          <Text style={styles.doneTitle}>
            {zone ? (
              <>
                You live in <Text style={{ color: colors[zone.color] }}>{zone.name}</Text>
              </>
            ) : (
              'All rated'
            )}
          </Text>
          <Text style={styles.doneText}>Tap any dot to change it.</Text>
        </View>
      </View>
      <Button
        title={editing ? 'Save my routine' : 'Start buying back my time'}
        icon={editing ? 'checkmark' : 'arrow-forward'}
        onPress={finish}
        loading={saving}
        style={styles.finish}
      />
    </View>
  ) : (
    <View>
      <SwipeRateCard
        item={item}
        nextItem={selected ? null : items.filter((it) => it !== item).find(needsRating)}
        money={draft.money}
        onMoney={pickMoney}
        onSwipe={(energy) => commit({ ...draft, energy })}
        onNeedMoney={() => setNudge(true)}
        meta={selected ? 'changing it' : left ? `${left} to rate` : ''}
        topRight={
          selected ? (
            <Pressable onPress={() => setSelected(null)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Cancel">
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          ) : previous ? (
            <Pressable onPress={() => setSelected(previous.activity)} hitSlop={10} accessibilityRole="button" style={styles.back}>
              <Ionicons name="arrow-undo" size={14} color={colors.primaryDark} />
              <Text style={styles.backText}>Back</Text>
            </Pressable>
          ) : null
        }
      />
      {nudge && !draft.money ? <Text style={styles.nudge}>Tap how much money it makes first.</Text> : null}
    </View>
  );

  return (
    <Screen footer={card}>
      <StepHeader
        step={stepNumber('swipe')}
        editing={editing}
        eyebrow="Your DRIP Matrix"
        title={done ? 'Here is your routine' : 'Rate your routine'}
        subtitle={
          done
            ? 'Each dot is an activity: higher makes more money, further right gives you more energy.'
            : 'Each rating puts a dot on your matrix.'
        }
      />
      <DripGraph items={items} selected={current} onSelect={(name) => setSelected(name)} />
      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors) => ({
  card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  backText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  nudge: { fontSize: 13, color: colors.accentText, marginTop: spacing.sm, textAlign: 'center' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doneTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  doneText: { fontSize: 13, color: colors.muted, marginTop: 2 },
  finish: { marginTop: spacing.md },
});
