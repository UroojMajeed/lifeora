import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Card } from './Card';
import Button from './Button';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const SHOW = 4; // draining tasks shown on Home; the rest are one tap away
const week = (hoursADay) => formatHours(hoursADay * WORKDAYS_PER_WEEK);

/** "STEP 3 · DELEGATION" on the left, a short status on the right. */
function StepHead({ step, name, status }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.head}>
      <Text style={styles.step}>
        Step {step} · <Text style={styles.stepName}>{name}</Text>
      </Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

/**
 * Journey step 3 on Home, as one simple question per draining task: "Have you delegated it?"
 * Yes marks it handed off (its hours move to Reinvest); No keeps it here, with a way into the
 * handoff steps for help. `onDelegated(activity, yes)` saves the answer.
 */
export function DelegationCard({ handoffs = [], onDelegated, onPlan, onSeeAll, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [saidNo, setSaidNo] = useState(() => new Set());
  const open = handoffs.filter((h) => h.status !== 'done').sort((a, b) => b.hours - a.hours);

  const answer = (activity, yes) => {
    Haptics.impactAsync(yes ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (yes) onDelegated(activity);
    else setSaidNo((s) => new Set(s).add(activity));
  };

  let content;
  if (!handoffs.length) {
    content = <Text style={styles.note}>Nothing in your routine drains you. Nothing to delegate.</Text>;
  } else if (!open.length) {
    content = (
      <View style={styles.noteRow}>
        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
        <Text style={styles.noteStrong}>You've delegated everything that drained you.</Text>
      </View>
    );
  } else {
    content = open.slice(0, SHOW).map((h, i) => (
      <View key={h.activity} style={[styles.task, i > 0 && styles.line]}>
        <Text style={styles.name} numberOfLines={1}>
          {h.activity} <Text style={styles.hours}>· {week(h.hours)} a week</Text>
        </Text>
        {saidNo.has(h.activity) ? (
          // Not yet: the way in to doing it, without nagging.
          <Pressable onPress={() => onPlan(h.activity)} hitSlop={6} accessibilityRole="button" style={styles.plan}>
            <Text style={styles.planText}>Not yet. Plan the handoff</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : (
          <View style={styles.ask}>
            <Text style={styles.question}>Have you delegated it?</Text>
            <Pressable
              onPress={() => answer(h.activity, false)}
              accessibilityRole="button"
              accessibilityLabel={`${h.activity}: not delegated yet`}
              style={({ pressed }) => [styles.no, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.noText}>No</Text>
            </Pressable>
            <Pressable
              onPress={() => answer(h.activity, true)}
              accessibilityRole="button"
              accessibilityLabel={`${h.activity}: yes, delegated`}
              style={({ pressed }) => [styles.yes, pressed && { opacity: 0.85 }]}
            >
              <Ionicons name="checkmark" size={15} color={colors.onColor} />
              <Text style={styles.yesText}>Yes</Text>
            </Pressable>
          </View>
        )}
      </View>
    ));
  }

  return (
    <View style={style}>
      <StepHead step={3} name="Delegation" status={open.length ? `${open.length} left` : null} />
      <Card style={styles.card}>
        {content}
        {open.length > SHOW ? (
          <Pressable onPress={onSeeAll} hitSlop={8} accessibilityRole="button" style={styles.link}>
            <Text style={styles.linkText}>See all {open.length}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.primary} />
          </Pressable>
        ) : null}
      </Card>
    </View>
  );
}

/**
 * Journey step 4 on Home: every task you've delegated lands here with the hours it freed (Undo if
 * it was a slip), then one button to reinvest that time (Fill) and what's reinvested so far. Before
 * the first "Yes" there's nothing to reinvest yet, so it says so, quietly.
 */
export function ReinvestCard({ handoffs = [], summary, fills = [], onUndo, onFill, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const delegated = handoffs.filter((h) => h.status === 'done');
  const bought = summary?.boughtBackHours || 0;
  const free = Math.max(0, Math.round((bought - (summary?.filledHours || 0)) * 100) / 100);

  let content;
  if (!delegated.length) {
    content = (
      <View style={styles.noteRow}>
        <Ionicons name="sunny-outline" size={18} color={colors.muted} />
        <Text style={styles.note}>Say yes to a delegated task and its hours land here, ready for a new job.</Text>
      </View>
    );
  } else {
    content = (
      <>
        {delegated.map((h, i) => (
          <View key={h.activity} style={[styles.freed, i > 0 && styles.line]}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.freedName} numberOfLines={1}>
              {h.activity}
            </Text>
            <Text style={styles.freedHours}>{week(h.hours)} freed</Text>
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                onUndo(h.activity);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`Undo: ${h.activity} isn't delegated`}
            >
              <Text style={styles.undo}>Undo</Text>
            </Pressable>
          </View>
        ))}
        <Button
          title={free >= 0.25 ? 'Reinvest your time' : 'See your reinvested time'}
          icon="sunny"
          variant={free >= 0.25 ? 'primary' : 'secondary'}
          onPress={onFill}
          style={styles.fillButton}
        />
        {fills.length ? (
          <Text style={styles.filled} numberOfLines={2}>
            Reinvested: {fills.map((f) => `${f.activity} ${formatHours(f.hours)}`).join(' · ')}
          </Text>
        ) : null}
      </>
    );
  }

  return (
    <View style={style}>
      <StepHead step={4} name="Reinvest" status={free >= 0.25 ? `${week(free)} a week to fill` : null} />
      <Card style={styles.card}>{content}</Card>
    </View>
  );
}

const makeStyles = (colors) => ({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: spacing.sm },
  step: { fontSize: 12, fontWeight: '800', color: colors.primary, letterSpacing: 1, textTransform: 'uppercase' },
  stepName: { color: colors.text },
  status: { fontSize: 13, fontWeight: '700', color: colors.muted },
  card: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  // Delegation: one task, one question.
  task: { paddingVertical: spacing.sm + 4 },
  name: { fontSize: 16, fontWeight: '800', color: colors.text },
  hours: { fontSize: 14, fontWeight: '600', color: colors.muted },
  ask: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  question: { flex: 1, fontSize: 14, color: colors.muted },
  no: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border },
  noText: { fontSize: 14, fontWeight: '700', color: colors.text },
  yes: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.primary },
  yesText: { fontSize: 14, fontWeight: '800', color: colors.onColor },
  plan: { flexDirection: 'row', alignItems: 'center', gap: 2, marginTop: 6 },
  planText: { fontSize: 14, fontWeight: '700', color: colors.primary },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingTop: spacing.sm, paddingBottom: spacing.xs },
  linkText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  note: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.muted, paddingVertical: spacing.sm },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  noteStrong: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.text, paddingVertical: spacing.sm },
  // Reinvest: what was freed, and the way to give it a new job.
  freed: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 48 },
  freedName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  freedHours: { fontSize: 13, fontWeight: '700', color: colors.success },
  undo: { fontSize: 13, fontWeight: '700', color: colors.muted, textDecorationLine: 'underline' },
  fillButton: { marginTop: spacing.sm + 2, marginBottom: spacing.xs },
  filled: { fontSize: 13, color: colors.muted, marginTop: spacing.sm, marginBottom: spacing.xs },
});
