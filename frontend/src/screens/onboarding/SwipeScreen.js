import { useCallback, useEffect, useState } from 'react';
import { LayoutAnimation, Modal, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import DripGraph from '../../components/DripGraph';
import SwipeRateCard from '../../components/SwipeRateCard';
import ZoneTitle from '../../components/ZoneTitle';
import { useOnboarding } from '../../context/OnboardingContext';
import { DRIP, quadrantFor, stepNumber, summarizeSchedule, valueForMoney } from '../../constants/content';
import { recordMove } from '../../storage/progress';
import { formatHours } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

const FLASH_MS = 1600; // how long the pop-up graph stays after a swipe

// One line per quadrant for the "What is the DRIP Matrix?" note (from the book, in our words).
const INFO = {
  production: 'Makes money and energizes you. Your best work: do more of it.',
  replacement: "Makes money but drains you. Train someone to replace you here.",
  investment: 'Energizes you but pays later: learning, health, planning. Keep it.',
  delegation: 'Drains you and pays little. Hand it off first.',
};

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
    (onboarding?.schedule || []).map(({ activity, hours, value, money, per, energy }) => ({
      activity,
      hours,
      value,
      money: money ?? null,
      per: per || 'day',
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
  const [showInfo, setShowInfo] = useState(false);
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
    const quadrant = quadrantFor({ value: valueForMoney(next.money), energy: next.energy });
    setFlash({ activity: item.activity, quadrant, at: Date.now() });
  };

  // The pop-up graph closes by itself after a moment (or on a tap).
  const [flash, setFlash] = useState(null);
  useEffect(() => {
    if (!flash) return undefined;
    const t = setTimeout(() => setFlash(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flash]);

  const [nudge, setNudge] = useState(false);
  const pickMoney = (money) => {
    setNudge(false);
    setDraft((d) => ({ ...d, money }));
  };

  // Back: reopen the activity rated just before this one.
  const index = item ? items.indexOf(item) : -1;
  const previous = index > 0 ? items[index - 1] : null;

  const left = items.filter(needsRating).length;
  const position = items.length - left + 1; // which card this is, e.g. 3 of 7
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
          {zone ? <ZoneTitle summary={summary} style={styles.doneTitle} /> : <Text style={styles.doneTitle}>All rated</Text>}
          <Text style={styles.doneText}>Tap any dot to change it.</Text>
        </View>
      </View>
      {/* The first win, so the finish feels like a start: the biggest draining task to hand off. */}
      {!editing && summary.firstHandoff ? (
        <View style={styles.firstMove}>
          <Ionicons name="flag" size={16} color={colors.accentText} />
          <Text style={styles.firstMoveText}>
            First move: hand off <Text style={styles.firstMoveName}>{summary.firstHandoff.activity}</Text>, it frees{' '}
            {formatHours(summary.firstHandoff.hours * 5)} a week.
          </Text>
        </View>
      ) : null}
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
        topLeft={
          <View style={styles.progress}>
            <Text style={styles.progressText}>{selected ? 'Changing' : `${position} of ${items.length}`}</Text>
          </View>
        }
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
        title={done ? 'Your DRIP Matrix' : 'Rate your routine'}
        subtitle="Sort each task by the money it makes and how it makes you feel."
      />

      {/* A short "what is this?" for the DRIP Matrix, closed by default so the screen stays calm. */}
      <Pressable
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          setShowInfo((v) => !v);
        }}
        accessibilityRole="button"
        accessibilityState={{ expanded: showInfo }}
        style={styles.infoToggle}
      >
        <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.infoToggleText}>What is the DRIP Matrix?</Text>
        <Ionicons name={showInfo ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
      </Pressable>
      {showInfo ? (
        <View style={styles.info}>
          {['production', 'replacement', 'investment', 'delegation'].map((key) => (
            <View key={key} style={styles.infoRow}>
              <View style={[styles.infoDot, { backgroundColor: colors[DRIP[key].color] }]} />
              <Text style={styles.infoText}>
                <Text style={[styles.infoName, { color: colors[DRIP[key].color] }]}>{DRIP[key].name}</Text>
                {'  '}
                {INFO[key]}
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      <DripGraph items={items} selected={current} onSelect={(name) => setSelected(name)} />
      <ErrorBanner message={error} />

      <Modal visible={Boolean(flash)} transparent animationType="fade" onRequestClose={() => setFlash(null)} statusBarTranslucent>
        <Pressable style={styles.flashBackdrop} onPress={() => setFlash(null)} accessibilityLabel="Close">
          {flash ? (
            <View style={styles.flashCard}>
              <Text style={styles.flashTitle} numberOfLines={2}>
                {flash.activity}
                <Text style={styles.flashArrow}>  →  </Text>
                <Text style={{ color: colors[DRIP[flash.quadrant].color] }}>{DRIP[flash.quadrant].name}</Text>
              </Text>
              <DripGraph key={flash.at} items={items} selected={flash.activity} flyIn={flash.activity} height={300} />
            </View>
          ) : null}
        </Pressable>
      </Modal>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  card: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  infoToggle: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', marginTop: -spacing.sm, marginBottom: spacing.md },
  infoToggleText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  info: { gap: spacing.sm, padding: spacing.md, marginBottom: spacing.md, borderRadius: radius.md, backgroundColor: colors.surfaceAlt },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  infoDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  infoText: { flex: 1, fontSize: 13, lineHeight: 19, color: colors.text },
  infoName: { fontWeight: '800' },
  flashBackdrop: { flex: 1, justifyContent: 'center', padding: spacing.md, backgroundColor: 'rgba(2,6,23,0.55)' },
  flashCard: { padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.background },
  flashTitle: { fontSize: 17, fontWeight: '800', color: colors.text, marginBottom: spacing.md, textAlign: 'center' },
  flashArrow: { color: colors.muted, fontWeight: '600' },
  firstMove: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  firstMoveText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  firstMoveName: { fontWeight: '800' },
  progress: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt },
  progressText: { fontSize: 12, fontWeight: '800', color: colors.primaryDark },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primarySoft },
  backText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  nudge: { fontSize: 13, color: colors.accentText, marginTop: spacing.sm, textAlign: 'center' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doneTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  doneText: { fontSize: 13, color: colors.muted, marginTop: 2 },
  finish: { marginTop: spacing.md },
});
