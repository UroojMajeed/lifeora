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
import CardHeader, { homeCard } from './CardHeader';

const h = (n) => `${Math.round(n * 10) / 10} h`;

/** The one thing to do now (from todaysMove()): a tag with how long it takes, the move, and one button. */
export function MoveCard({ move, first, onPress, loading, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  if (!move) return null;
  return (
    <View style={[styles.move, style]}>
      <CardHeader
        icon={move.action === 'nextRound' ? 'refresh' : 'flag'}
        iconColor={colors.accentText}
        title={first ? 'Your First Move' : 'Your Next Move'}
        sub={move.minutes ? `About ${move.minutes} min` : null}
      />
      <Text style={[styles.moveTitle, styles.content]}>{move.title}</Text>
      <Text style={styles.moveBody}>{move.body}</Text>
      <Button title={first && move.stage === 'transfer' ? 'Start my first handoff' : move.cta} icon="arrow-forward" onPress={onPress} loading={loading} style={styles.moveButton} />
    </View>
  );
}

/**
 * The first move, as one flow in one card: "Delegate it" (your biggest drain and what it frees) →
 * "Did you delegate it?" (Not yet / Yes) → on Yes, a short "Done!" moment with the hours you got back,
 * then `onYes` (Home then fades into your progress). Not yet: a calm "No rush", right here, then
 * back to the start.
 */
export function DelegateAsk({ task, onYes, next, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [step, setStep] = useState('intro'); // 'intro' | 'ask' | 'notYet' | 'done'
  if (!task) return null;
  const week = h(task.hours * 5);
  const go = (next) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStep(next);
  };

  return (
    <View style={[styles.move, step === 'done' && styles.moveDone, style]}>
      {step !== 'done' ? <CardHeader icon="flag" iconColor={colors.accentText} title={next ? 'Your Next Move' : 'Your First Move'} /> : null}
      <Animated.View key={step} entering={FadeIn.duration(250)}>
        {step === 'intro' ? (
          <>
            <View style={styles.taskRow}>
              <View style={styles.taskIcon}>
                <Ionicons name="people" size={15} color={colors.chart.delegation} />
              </View>
              <View style={styles.taskMain}>
                <Text style={styles.moveTitle}>{task.activity}</Text>
                <Text style={styles.taskSub}>
                  {h(task.hours)} a day · <Text style={styles.taskDrains}>drains you</Text>
                </Text>
              </View>
            </View>
            {/* The highlight: what handing it off gives back. */}
            <View style={styles.gain}>
              <Ionicons name="sparkles" size={15} color={colors.accentText} />
              <Text style={styles.gainText}>Free up {week} a week</Text>
            </View>
            <Button title="Delegate it" icon="arrow-forward" onPress={() => go('ask')} style={styles.moveButton} />
          </>
        ) : null}

        {step === 'ask' ? (
          <>
            <Text style={[styles.moveTitle, styles.content]}>Did you delegate {task.activity.toLowerCase()}?</Text>
            <Text style={styles.moveBody}>Handed to someone, automated, or simply dropped: it all counts.</Text>
            <View style={styles.answers}>
              <Button title="Not yet" variant="secondary" onPress={() => go('notYet')} style={styles.answer} />
              <Button
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
            <Text style={[styles.moveTitle, styles.content]}>No rush</Text>
            <Text style={styles.moveBody}>Come back and tap Delegate it once {task.activity.toLowerCase()} is off your plate.</Text>
            <Button title="Got it" variant="secondary" onPress={() => go('intro')} style={styles.moveButton} />
          </>
        ) : null}

        {step === 'done' ? (
          <View style={styles.doneBox} accessibilityLiveRegion="polite">
            <Ionicons name="checkmark-circle" size={44} color={colors.success} />
            <Text style={styles.doneTitle}>Done!</Text>
            <Text style={styles.doneText}>{week} a week is yours again</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}

/**
 * After a handoff: your production time before (at the audit) and now (plus the freed hours you
 * reinvested in it), as two bars on one scale, with the gain highlighted.
 */
export function ProductionCompare({ before, gain, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const now = before + gain;
  const scale = Math.max(now, 0.5);
  return (
    <View style={[styles.prod, style]}>
      <CardHeader
        icon="flash"
        iconColor={colors.chart.production}
        title="Your Production Time"
        right={
          gain > 0 ? (
            <View style={styles.prodChip}>
              <Ionicons name="arrow-up" size={12} color={colors.chart.production} />
              <Text style={styles.prodChipText}>{h(gain)}</Text>
            </View>
          ) : null
        }
      />

      <View style={[styles.prodRow, styles.content]}>
        <Text style={styles.prodLabel}>Before</Text>
        <View style={styles.prodTrack}>
          <View style={[styles.prodBar, { width: `${(before / scale) * 100}%`, backgroundColor: colors.border }]} />
        </View>
        <Text style={styles.prodValueMuted}>{h(before)}</Text>
      </View>
      <View style={styles.prodRow}>
        <Text style={[styles.prodLabel, styles.prodLabelNow]}>Now</Text>
        <View style={styles.prodTrack}>
          <View style={[styles.prodBar, { width: `${(before / scale) * 100}%`, backgroundColor: colors.chart.production }]} />
          <View style={[styles.prodBar, styles.prodGain, { width: `${(gain / scale) * 100}%`, backgroundColor: colors.chart.production }]} />
        </View>
        <Text style={styles.prodValue}>{h(now)}</Text>
      </View>

      <Text style={styles.prodLine}>
        {gain > 0 ? (
          <>
            <Text style={styles.prodStrong}>+{h(gain * 5)} a week</Text> of your best work, reinvested from what you delegated.
          </>
        ) : (
          'Reinvest freed hours in growing the business to grow this.'
        )}
      </Text>
    </View>
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
  move: { ...homeCard(colors, isDark), backgroundColor: colors.tintMove },
  content: { marginTop: spacing.md }, // the gap between a card's header and what's under it
  moveTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  moveBody: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: 4 },
  moveButton: { marginTop: spacing.md, minHeight: 48 },
  moveDone: { borderColor: colors.success, backgroundColor: colors.successSoft },
  taskRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 4, marginTop: spacing.md },
  taskIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.errorSoft },
  taskMain: { flex: 1, minWidth: 0 },
  taskSub: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 2 },
  taskDrains: { color: colors.error },
  gain: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: spacing.md, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 16, backgroundColor: colors.surface },
  gainText: { fontSize: 14, fontWeight: '800', color: colors.accentText },
  // Production: before vs now.
  prod: { ...homeCard(colors, isDark), backgroundColor: colors.tintProduction },
  prodChip: { flexDirection: 'row', alignItems: 'center', gap: 2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: colors.surface },
  prodChipText: { fontSize: 12, fontWeight: '800', color: colors.chart.production },
  prodRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  prodLabel: { width: 48, fontSize: 12, fontWeight: '600', color: colors.muted },
  prodLabelNow: { fontWeight: '800', color: colors.text },
  prodTrack: { flex: 1, flexDirection: 'row', gap: 2, height: 14, borderRadius: 7, overflow: 'hidden', backgroundColor: colors.calmTrack },
  prodBar: { height: 14 },
  prodGain: { opacity: 0.5 },
  prodValue: { width: 44, textAlign: 'right', fontSize: 14, fontWeight: '800', color: colors.text },
  prodValueMuted: { width: 44, textAlign: 'right', fontSize: 14, fontWeight: '600', color: colors.muted },
  prodLine: { fontSize: 13, lineHeight: 19, color: colors.muted, marginTop: spacing.md },
  prodStrong: { fontWeight: '800', color: colors.chart.production },
  doneBox: { alignItems: 'center', paddingVertical: spacing.md },
  doneTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: spacing.sm },
  doneText: { fontSize: 15, fontWeight: '700', color: colors.success, marginTop: 2 },
  answers: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  answer: { flex: 1, minHeight: 48 },
  plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: spacing.sm + 2 },
  planText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  // Waiting progress
  empty: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.border,
    backgroundColor: colors.tintWaiting,
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
