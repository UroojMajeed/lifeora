import { useCallback, useEffect, useRef, useState } from 'react';
import { LayoutAnimation, Pressable, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import DripGraph from '../../components/DripGraph';
import SwipeRateCard from '../../components/SwipeRateCard';
import ZoneTitle from '../../components/ZoneTitle';
import QuadrantBoard from '../../components/QuadrantBoard';
import { useOnboarding } from '../../context/OnboardingContext';
import { DRIP, quadrantFor, stepNumber, summarizeSchedule, valueForMoney } from '../../constants/content';
import { recordMove } from '../../storage/progress';
import { formatHours } from '../../utils/format';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { radius, spacing } from '../../theme';

const CHIP_MS = 1100; // how long the task just rated stays outlined on the board
const REVEAL_STAGGER = 140; // ms between dots flying in when the finished graph appears

/** A task's name gliding from the swipe card into its quadrant, then fading as it lands. */
function Flyer({ label, color, from, to, onDone }) {
  const styles = useStyles(makeStyles);
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) }, (ok) => ok && runOnJS(onDone)());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: t.value < 0.75 ? 1 : 1 - (t.value - 0.75) * 4,
    transform: [
      { translateX: from.x + (to.x - from.x) * t.value },
      { translateY: from.y + (to.y - from.y) * t.value },
      { translateX: -60 },
      { translateY: -14 },
      { scale: 1 - t.value * 0.35 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.flyer, { borderColor: color }, style]}>
      <Text style={styles.flyerText} numberOfLines={1}>
        {label}
      </Text>
    </Animated.View>
  );
}

// One line per quadrant for the "What is the DRIP Matrix?" note (from the book, in our words).
const INFO = {
  production: 'Makes money and energizes you. Your best work: do more of it.',
  replacement: "Makes money but drains you. Train someone to replace you here.",
  investment: 'Energizes you but pays later: learning, health, planning. Keep it.',
  delegation: 'Drains you and pays little. Hand it off first.',
};

/**
 * Rate your routine: for each task, how much money it makes ($ to $$$$$) and whether it drains or
 * energizes you. Each rating puts the task into its quadrant on the board above; after the last one
 * the full DRIP graph is revealed. Tap any task to change it. Also used after onboarding (`editing`:
 * rate new tasks) and at the start of a new round (`round`: rate the whole routine again).
 */
export default function SwipeScreen({ navigation, route }) {
  const editing = Boolean(route.params?.editing);
  const { onboarding, saveStep, complete } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const { height: screenHeight } = useWindowDimensions();

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
    const changing = Boolean(selected);
    setItems(list);
    setSelected(null);
    persist(list);
    const quadrant = quadrantFor({ value: valueForMoney(next.money), energy: next.energy });
    setChip({ activity: item.activity, quadrant, at: Date.now() });
    // Show where it went: the name glides from the card into its box (only while the board is up).
    const box = boxes.current[quadrant];
    // (Not for the last one: the board becomes the graph right then, and its dots take over.)
    if (!changing && box && cardRef.current && list.some(needsRating)) {
      cardRef.current.measureInWindow((cx, cy, cw) =>
        box.measureInWindow((bx, by, bw, bh) =>
          setFlyer({
            label: item.activity,
            color: colors[DRIP[quadrant].color],
            from: { x: cx + cw / 2, y: cy + 40 },
            to: { x: bx + bw / 2, y: by + bh / 2 },
            at: Date.now(),
          })
        )
      );
    }
  };

  const boxes = useRef({});
  const cardRef = useRef(null);
  const [flyer, setFlyer] = useState(null);

  // The task just rated, outlined on the board for a moment.
  const [chip, setChip] = useState(null);
  useEffect(() => {
    if (!chip) return undefined;
    const t = setTimeout(() => setChip(null), CHIP_MS);
    return () => clearTimeout(t);
  }, [chip]);

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
  // Everything rated: the board becomes the full graph (and stays, even while changing a task).
  const finished = !items.some(needsRating);
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
          <Text style={styles.doneText}>Tap any task to change it.</Text>
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
    <View style={{ flex: 1 }}>
      <Screen footer={<View ref={cardRef} collapsable={false}>{card}</View>}>
        <StepHeader
          step={stepNumber('swipe')}
          editing={editing}
          title={finished ? 'Your DRIP Matrix' : 'Rate your routine'}
          subtitle={
            finished
              ? 'Each dot is a task: higher makes more money, further right gives you energy.'
              : 'Sort each task by the money it makes and how it makes you feel.'
          }
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

        {/* While rating: the four quadrants filling up. When done: the full graph, in the same place, for good. */}
        {finished ? (
          <DripGraph
            items={items}
            stagger={REVEAL_STAGGER}
            selected={selected}
            onSelect={(name) => setSelected(name)}
            height={Math.min(360, screenHeight * 0.42)}
          />
        ) : (
          <QuadrantBoard
            items={items}
            latest={chip?.activity}
            selected={selected}
            onSelect={(name) => setSelected(name)}
            registerBox={(key, node) => {
              boxes.current[key] = node;
            }}
          />
        )}
        <ErrorBanner message={error} />

      </Screen>
      {flyer ? <Flyer key={flyer.at} {...flyer} onDone={() => setFlyer(null)} /> : null}
    </View>
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
  firstMove: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm + 2, borderRadius: radius.md, backgroundColor: colors.accentSoft },
  firstMoveText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  firstMoveName: { fontWeight: '800' },
  flyer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 120,
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    backgroundColor: colors.surface,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  flyerText: { fontSize: 12, fontWeight: '800', color: colors.text },
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
