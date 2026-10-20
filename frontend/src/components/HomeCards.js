import { useState } from 'react';
import { Image, LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { Card } from './Card';
import Button from './Button';
import { formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, cardShadow, radius, spacing } from '../theme';

const h = (n) => `${Math.round(n * 10) / 10} h`;

/** The one thing to do now (from todaysMove()): a tag with how long it takes, the move, and one button. */
export function MoveCard({ move, first, onPress, loading, style }) {
  const styles = useStyles(makeStyles);
  if (!move) return null;
  return (
    <View style={[styles.move, style]}>
      <Text style={styles.tag}>
        {first ? 'Your first move' : "Today's move"}
        {move.minutes ? ` · ${move.minutes} min` : ''}
      </Text>
      <Text style={styles.moveTitle}>{move.title}</Text>
      <Text style={styles.moveBody}>{move.body}</Text>
      <Button title={first && move.stage === 'transfer' ? 'Start my first handoff' : move.cta} icon="arrow-forward" onPress={onPress} loading={loading} style={styles.moveButton} />
    </View>
  );
}

/** A pill-shaped answer on the dark first-move card: solid (white) or ghost. */
function HeroButton({ title, icon, onPress, ghost, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      style={({ pressed }) => [styles.heroBtn, ghost && styles.heroBtnGhost, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }, style]}
    >
      <Text style={[styles.heroBtnText, ghost && styles.heroBtnTextGhost]}>{title}</Text>
      {icon ? <Ionicons name={icon} size={17} color={ghost ? colors.heroText : colors.heroFrom} /> : null}
    </Pressable>
  );
}

/**
 * The first move, as one flow in one dark card with a warm glow: your biggest drain (an icon, the
 * task, how long it takes, and highlighted: the hours a week it frees) and "Delegate it" → "Did you
 * delegate it?" (Not yet / Yes) → on Yes, a short "Done!" moment, then `onYes` (Home then fades into
 * your progress). Not yet: a calm "No rush", right here, then back to the start.
 */
export function DelegateAsk({ task, onYes, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [step, setStep] = useState('intro'); // 'intro' | 'ask' | 'notYet' | 'done'
  if (!task) return null;
  const week = h(task.hours * 5);
  const go = (next) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(next);
  };

  return (
    <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.first, style]}>
      {/* Two soft glows: the apricot of the sun, the mint of growth. */}
      <View pointerEvents="none" style={[styles.glow, styles.glowApricot]} />
      <View pointerEvents="none" style={[styles.glow, styles.glowMint]} />

      <Animated.View key={step} entering={FadeIn.duration(250)}>
        {step !== 'done' ? (
          <View style={styles.firstTag}>
            <Ionicons name="rocket" size={12} color={colors.heroFrom} />
            <Text style={styles.firstTagText}>Your first move</Text>
          </View>
        ) : null}

        {step === 'intro' ? (
          <>
            <View style={styles.taskRow}>
              <View style={styles.taskIcon}>
                <Ionicons name="people" size={22} color={colors.heroText} />
              </View>
              <View style={styles.taskMain}>
                <Text style={styles.firstLabel}>Delegate</Text>
                <Text style={styles.firstTitle}>{task.activity}</Text>
              </View>
            </View>
            <View style={styles.facts}>
              <View style={styles.fact}>
                <Ionicons name="time-outline" size={14} color={colors.heroMuted} />
                <Text style={styles.factText}>{h(task.hours)} a day</Text>
              </View>
              <View style={styles.fact}>
                <Ionicons name="battery-dead-outline" size={14} color={colors.heroMuted} />
                <Text style={styles.factText}>Drains you</Text>
              </View>
            </View>
            {/* The highlight: what it gives back. */}
            <View style={styles.gain}>
              <Ionicons name="sparkles" size={18} color={brand.apricot} />
              <Text style={styles.gainText}>
                Free up <Text style={styles.gainStrong}>{week} a week</Text>
              </Text>
            </View>
            <HeroButton title="Delegate it" icon="arrow-forward" onPress={() => go('ask')} style={styles.firstBtn} />
          </>
        ) : null}

        {step === 'ask' ? (
          <>
            <View style={styles.askIcon}>
              <Ionicons name="help" size={24} color={colors.heroFrom} />
            </View>
            <Text style={styles.firstTitle}>Did you delegate {task.activity.toLowerCase()}?</Text>
            <Text style={styles.firstBody}>Handed to someone, automated, or simply dropped: it all counts.</Text>
            <View style={styles.answers}>
              <HeroButton title="Not yet" ghost onPress={() => go('notYet')} style={styles.answer} />
              <HeroButton
                title="Yes"
                icon="checkmark"
                onPress={() => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
                  go('done');
                  // A moment to enjoy it, then on to your progress.
                  setTimeout(() => onYes(task.activity), 1500);
                }}
                style={styles.answer}
              />
            </View>
          </>
        ) : null}

        {step === 'notYet' ? (
          <>
            <View style={styles.askIcon}>
              <Ionicons name="leaf" size={22} color={colors.heroFrom} />
            </View>
            <Text style={styles.firstTitle}>No rush</Text>
            <Text style={styles.firstBody}>Come back and tap Delegate it once {task.activity.toLowerCase()} is off your plate.</Text>
            <HeroButton title="Got it" ghost onPress={() => go('intro')} style={styles.firstBtn} />
          </>
        ) : null}

        {step === 'done' ? (
          <View style={styles.doneBox} accessibilityLiveRegion="polite">
            <View style={styles.doneIcon}>
              <Ionicons name="checkmark" size={34} color={colors.heroFrom} />
            </View>
            <Text style={styles.doneTitle}>Done!</Text>
            <Text style={styles.doneText}>{week} a week is yours again</Text>
          </View>
        ) : null}
      </Animated.View>
    </LinearGradient>
  );
}

/** Before the first handoff: progress waits, small: an empty ring that says what fills it. */
export function ProgressWaiting({ style }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={[styles.empty, style]} accessible accessibilityLabel="Hours bought back: none yet. Your first handoff starts this.">
      <View style={styles.emptyRing}>
        <Text style={styles.emptyRingText}>0 h</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.emptyTitle}>Hours bought back</Text>
        <Text style={styles.emptyText}>Your first handoff starts this.</Text>
      </View>
    </View>
  );
}

/**
 * After the first handoff, the top of Home: your "why" (photo and words, from Me), the hours bought
 * back a week, what they're worth at your Buyback Rate, and a bar of how far through your drains you are.
 */
export function ProgressHero({ boughtWeek, drainingWeek, buybackRate, currency, why, onPress, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const share = drainingWeek ? Math.min(1, boughtWeek / drainingWeek) : 0;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => [style, pressed && { opacity: 0.95 }]}>
      <LinearGradient colors={[colors.heroFrom, colors.heroTo]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.hero}>
        {/* Two soft glows: the apricot of the sun, the mint of growth. */}
        <View pointerEvents="none" style={[styles.glow, styles.glowApricot]} />
        <View pointerEvents="none" style={[styles.glow, styles.glowMint]} />
        <View style={styles.why}>
          {why?.uri ? (
            <Image source={{ uri: why.uri }} style={styles.whyPhoto} />
          ) : (
            <LinearGradient colors={[brand.apricot, brand.mint]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.whyPhoto} />
          )}
          <Text style={styles.whyText} numberOfLines={1}>
            {why?.caption ? `For: ${why.caption}` : 'For the work and life you love'}
          </Text>
        </View>
        <Text style={styles.big}>
          {h(boughtWeek)} <Text style={styles.bigSmall}>a week bought back</Text>
        </Text>
        {buybackRate ? (
          <Text style={styles.heroSub}>Worth about {formatMoney(boughtWeek * buybackRate, currency, { decimals: 0 })} a week at your Buyback Rate</Text>
        ) : null}
        <View style={styles.prog}>
          <View style={[styles.progFill, { width: `${share * 100}%` }]} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

/** Hours bought back each week: a column per week, this week highlighted, so coming back is rewarded. */
export function WeeklyChart({ weeks = [], style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const max = Math.max(...weeks.map((w) => w.hours), 1);
  const top = Math.max(2, Math.ceil((max * 1.15) / 2) * 2); // a round top with a little headroom
  const now = weeks[weeks.length - 1]?.hours || 0;
  const before = weeks[weeks.length - 2]?.hours || 0;
  const delta = Math.round((now - before) * 10) / 10;
  const PLOT = 96;
  return (
    <Card style={[styles.gcard, style]}>
      <View style={styles.gHead}>
        <Text style={styles.gTitle}>Bought back each week</Text>
        {delta > 0 ? <Text style={styles.gDelta}>+{delta} h this week</Text> : null}
      </View>
      <View style={[styles.wChart, { height: PLOT }]}>
        {[top, top / 2, 0].map((v) => (
          <View key={v} pointerEvents="none" style={[styles.gridRow, { top: PLOT - (v / top) * PLOT - 7 }]}>
            <Text style={styles.tick}>{v ? `${v}h` : '0'}</Text>
            <View style={[styles.gridLine, v === 0 && styles.baseline]} />
          </View>
        ))}
        <View style={styles.wCols}>
          {weeks.map((w) => (
            <View key={w.key} style={styles.wSlot}>
              {w.now && w.hours ? <Text style={styles.wValue}>{h(w.hours)}</Text> : null}
              <View
                style={[
                  styles.wCol,
                  w.hours
                    ? { height: (w.hours / top) * PLOT, backgroundColor: colors.chart.production, opacity: w.now ? 1 : 0.55 }
                    : { height: 2, backgroundColor: colors.border },
                ]}
              />
            </View>
          ))}
        </View>
      </View>
      <View style={styles.wLabels}>
        {weeks.map((w, i) => (
          <Text key={w.key} style={[styles.wLabel, w.now && styles.wLabelNow]}>
            {w.now ? 'Now' : `W${i + 1}`}
          </Text>
        ))}
      </View>
    </Card>
  );
}

/** Draining hours a day, before (at your audit) and now: two bars that show the drain shrinking. */
export function DrainCompare({ before, now, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const max = Math.max(before, now, 0.0001);
  const saved = Math.max(0, before - now);
  return (
    <Card style={[styles.gcard, style]}>
      <Text style={styles.gTitle}>Draining hours a day</Text>
      {[
        { label: 'Before', value: before, faded: true },
        { label: 'Now', value: now, faded: false },
      ].map((r) => (
        <View key={r.label} style={styles.hbar}>
          <Text style={styles.hLabel}>{r.label}</Text>
          <View style={styles.hTrack}>
            <View style={[styles.hFill, { width: `${(r.value / max) * 100}%`, backgroundColor: colors.error, opacity: r.faded ? 0.4 : 1 }]} />
          </View>
          <Text style={styles.hValue}>{h(r.value)}</Text>
        </View>
      ))}
      {saved ? <Text style={styles.saved}>{h(saved)} a day less of what drains you</Text> : null}
    </Card>
  );
}

const makeStyles = (colors, isDark) => ({
  // Move
  move: { padding: spacing.md, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  tag: { fontSize: 11, fontWeight: '700', color: colors.accentText, letterSpacing: 0.8, textTransform: 'uppercase' },
  moveTitle: { fontSize: 18, lineHeight: 23, fontWeight: '800', color: colors.text, letterSpacing: -0.2, marginTop: 6 },
  moveBody: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },
  moveButton: { marginTop: spacing.md, minHeight: 48 },
  moveDone: { borderColor: colors.success, backgroundColor: colors.successSoft },
  // The first move: a dark card with a warm glow.
  first: { padding: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  firstTag: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: brand.apricot },
  firstTagText: { fontSize: 11, fontWeight: '800', color: colors.heroFrom, letterSpacing: 0.6, textTransform: 'uppercase' },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginTop: spacing.md },
  taskIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.heroChip, borderWidth: 1, borderColor: colors.heroDivider },
  taskMain: { flex: 1, minWidth: 0 },
  firstLabel: { fontSize: 13, fontWeight: '600', color: colors.heroMuted },
  firstTitle: { fontSize: 20, lineHeight: 26, fontWeight: '800', color: colors.heroText, letterSpacing: -0.3, marginTop: 2 },
  firstBody: { fontSize: 14, lineHeight: 20, color: colors.heroMuted, marginTop: 6 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.heroChip },
  factText: { fontSize: 12, fontWeight: '700', color: colors.heroMuted },
  gain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: 'rgba(245,185,113,0.16)', borderWidth: 1, borderColor: 'rgba(245,185,113,0.45)' },
  gainText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.heroText },
  gainStrong: { fontWeight: '800', color: brand.apricot },
  firstBtn: { marginTop: spacing.md },
  heroBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, minHeight: 50, borderRadius: 25, backgroundColor: '#FFFFFF' },
  heroBtnGhost: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.45)' },
  heroBtnText: { fontSize: 16, fontWeight: '800', color: colors.heroFrom },
  heroBtnTextGhost: { color: colors.heroText },
  askIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.apricot, marginTop: spacing.md, marginBottom: spacing.sm },
  doneBox: { alignItems: 'center', paddingVertical: spacing.md },
  doneIcon: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: brand.mint },
  doneTitle: { fontSize: 24, fontWeight: '800', color: colors.heroText, marginTop: spacing.sm },
  doneText: { fontSize: 15, fontWeight: '700', color: brand.mint, marginTop: 2 },
  answers: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  answer: { flex: 1, minHeight: 48 },
  plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: spacing.sm + 2 },
  planText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  // Waiting progress
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.sm + 4,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyRing: { width: 42, height: 42, borderRadius: 21, borderWidth: 4, borderColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  emptyRingText: { fontSize: 10, fontWeight: '800', color: colors.muted },
  emptyTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  emptyText: { fontSize: 12, lineHeight: 17, color: colors.muted },
  // Hero
  hero: { padding: spacing.md, borderRadius: radius.lg, overflow: 'hidden' },
  glow: { position: 'absolute', borderRadius: 999 },
  glowApricot: { width: 180, height: 180, right: -50, top: -70, backgroundColor: brand.apricot, opacity: 0.32 },
  glowMint: { width: 200, height: 200, left: -80, bottom: -120, backgroundColor: brand.mint, opacity: 0.22 },
  why: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  whyPhoto: { width: 24, height: 24, borderRadius: 7 },
  whyText: { flex: 1, fontSize: 12, fontWeight: '600', color: colors.heroMuted },
  big: { fontSize: 32, lineHeight: 38, fontWeight: '800', color: colors.heroText, letterSpacing: -0.8, marginTop: spacing.sm },
  bigSmall: { fontSize: 14, fontWeight: '600', color: colors.heroMuted, letterSpacing: 0 },
  heroSub: { fontSize: 12, color: colors.heroMuted, marginTop: 2 },
  prog: { height: 6, borderRadius: 3, marginTop: spacing.sm + 4, backgroundColor: colors.heroChip, overflow: 'hidden' },
  progFill: { height: 6, borderRadius: 3, backgroundColor: brand.apricot },
  // Graph cards
  gcard: { padding: spacing.md },
  gHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  gTitle: { fontSize: 14, fontWeight: '800', color: colors.text },
  gDelta: { fontSize: 12, fontWeight: '700', color: colors.chart.production },
  wChart: { marginTop: spacing.lg, marginLeft: 0 },
  gridRow: { position: 'absolute', left: 0, right: 0, height: 14, flexDirection: 'row', alignItems: 'center' },
  tick: { width: 26, textAlign: 'right', marginRight: 6, fontSize: 10, fontWeight: '600', color: colors.muted },
  gridLine: { flex: 1, height: 1, backgroundColor: colors.border, opacity: 0.7 },
  baseline: { height: 1.5, backgroundColor: colors.muted, opacity: 0.5 },
  wCols: { position: 'absolute', left: 32, right: 0, top: 0, bottom: 0, flexDirection: 'row', gap: 8, paddingHorizontal: 6 },
  wSlot: { flex: 1, justifyContent: 'flex-end' },
  wCol: { borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  wValue: { textAlign: 'center', fontSize: 11, fontWeight: '800', color: colors.text, marginBottom: 3 },
  wLabels: { flexDirection: 'row', gap: 8, marginLeft: 32, paddingHorizontal: 6, marginTop: 6 },
  wLabel: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', color: colors.muted },
  wLabelNow: { color: colors.text },
  hbar: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm + 2 },
  hLabel: { width: 46, fontSize: 12, fontWeight: '600', color: colors.muted },
  hTrack: { flex: 1, height: 14, borderRadius: 7, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  hFill: { height: 14, borderRadius: 7 },
  hValue: { fontSize: 13, fontWeight: '800', color: colors.text },
  saved: { fontSize: 12, fontWeight: '700', color: colors.chart.production, marginTop: spacing.sm },
});
