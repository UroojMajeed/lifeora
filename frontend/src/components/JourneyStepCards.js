import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Card } from './Card';
import Button from './Button';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { reminderLabel, reminderOptions } from '../storage/reminders';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const week = (hoursADay) => formatHours(hoursADay * WORKDAYS_PER_WEEK);

/** The journey's numbered circle and the step's name on the left, a short status on the right. */
function StepHead({ step, name, status }) {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.head} accessibilityRole="header" accessibilityLabel={`Step ${step}, ${name}${status ? `. ${status}` : ''}`}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{step}</Text>
      </View>
      <Text style={styles.stepName}>{name}</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
    </View>
  );
}

/**
 * Journey step 3 on Home, one task at a time: your next handoff, highlighted, with what it frees
 * ("Delegate it and free up 15h a week…"). "Delegate it now" marks it delegated (its hours move to
 * Reinvest); "Remind me later" sets it aside until a chosen time (`reminders`: { activity: ISO }),
 * when it comes back to the top. The other tasks open in the card with "Show all".
 */
export function DelegationCard({ handoffs = [], reminders = {}, onDelegated, onRemind, onPlan, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [all, setAll] = useState(false); // the other tasks, opened from the card
  const [picking, setPicking] = useState(false); // choosing a reminder time
  const now = Date.now();

  const open = handoffs.filter((h) => h.status !== 'done');
  const remindAt = (h) => (reminders[h.activity] ? new Date(reminders[h.activity]).getTime() : null);
  // Set aside until later: the reminder is still ahead.
  const later = open.filter((h) => remindAt(h) > now).sort((a, b) => remindAt(a) - remindAt(b));
  // Up now: reminders that are due first (they came back), then the biggest drains.
  const active = open
    .filter((h) => !(remindAt(h) > now))
    .sort((a, b) => Boolean(remindAt(b)) - Boolean(remindAt(a)) || b.hours - a.hours);
  const focus = active[0];
  const rest = active.slice(1);
  const due = focus && remindAt(focus);

  const delegate = (activity) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPicking(false);
    onDelegated(activity);
    if (reminders[activity]) onRemind(activity, null);
  };
  const remind = (activity, date) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setPicking(false);
    onRemind(activity, date);
  };

  let content;
  if (!handoffs.length) {
    content = (
      <Card style={styles.card}>
        <Text style={styles.note}>Nothing in your routine drains you. Nothing to delegate.</Text>
      </Card>
    );
  } else if (!open.length) {
    content = (
      <Card style={styles.card}>
        <View style={styles.noteRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.noteStrong}>You've delegated everything that drained you.</Text>
        </View>
      </Card>
    );
  } else {
    content = (
      <>
        {focus ? (
          // Your next handoff, highlighted.
          <LinearGradient colors={colors.cream} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.focus}>
            <View style={styles.tag}>
              <Ionicons name={due ? 'alarm' : 'hand-left'} size={13} color={colors.accentText} />
              <Text style={styles.tagText}>{due ? 'Reminder: time to delegate' : 'Your next handoff'}</Text>
            </View>
            <Text style={styles.focusName} numberOfLines={2}>
              {focus.activity}
            </Text>
            <Text style={styles.focusLine}>
              Delegate it and free up <Text style={styles.focusHours}>{week(focus.hours)} a week</Text> for the work and life you love.
            </Text>
            <Button title="Delegate it now" icon="arrow-forward" onPress={() => delegate(focus.activity)} style={styles.focusButton} />
            {picking ? (
              <View style={styles.times}>
                {reminderOptions().map((o) => (
                  <Pressable
                    key={o.key}
                    onPress={() => remind(focus.activity, o.date)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remind me ${o.label}`}
                    style={({ pressed }) => [styles.time, pressed && { opacity: 0.7 }]}
                  >
                    <Text style={styles.timeText}>{o.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : (
              <Pressable
                onPress={() => {
                  LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                  setPicking(true);
                }}
                accessibilityRole="button"
                style={({ pressed }) => [styles.later, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="alarm-outline" size={16} color={colors.text} />
                <Text style={styles.laterText}>Remind me later</Text>
              </Pressable>
            )}
            <Pressable onPress={() => onPlan(focus.activity)} hitSlop={6} accessibilityRole="button" style={styles.plan}>
              <Text style={styles.planText}>Need help? Plan the handoff</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </Pressable>
          </LinearGradient>
        ) : (
          <Card style={styles.card}>
            <Text style={styles.note}>Everything else is set for later. Your reminders are below.</Text>
          </Card>
        )}

        {/* Set aside until a reminder. */}
        {later.map((h) => (
          <View key={h.activity} style={styles.laterRow}>
            <Ionicons name="alarm-outline" size={14} color={colors.muted} />
            <Text style={styles.laterRowText} numberOfLines={1}>
              {h.activity} · {reminderLabel(reminders[h.activity])}
            </Text>
            <Pressable onPress={() => onRemind(h.activity, null)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Cancel the reminder for ${h.activity}`}>
              <Ionicons name="close" size={16} color={colors.muted} />
            </Pressable>
          </View>
        ))}

        {/* The other tasks, opened from the card. */}
        {rest.length ? (
          <>
            {all ? (
              <Card style={[styles.card, styles.restCard]}>
                {rest.map((h, i) => (
                  <View key={h.activity} style={[styles.restRow, i > 0 && styles.line]}>
                    <Text style={styles.restName} numberOfLines={1}>
                      {h.activity} <Text style={styles.hours}>· {week(h.hours)} a week</Text>
                    </Text>
                    <Pressable
                      onPress={() => delegate(h.activity)}
                      accessibilityRole="button"
                      accessibilityLabel={`Delegate ${h.activity} now`}
                      style={({ pressed }) => [styles.small, pressed && { opacity: 0.8 }]}
                    >
                      <Text style={styles.smallText}>Delegate</Text>
                    </Pressable>
                  </View>
                ))}
              </Card>
            ) : null}
            <Pressable
              onPress={() => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                setAll((v) => !v);
              }}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityState={{ expanded: all }}
              style={styles.link}
            >
              <Text style={styles.linkText}>{all ? 'Show less' : `Show all ${active.length} tasks`}</Text>
              <Ionicons name={all ? 'chevron-up' : 'chevron-down'} size={14} color={colors.primary} />
            </Pressable>
          </>
        ) : null}
      </>
    );
  }

  return (
    <View style={style}>
      <StepHead step={3} name="Delegation" status={open.length ? `${open.length} left` : null} />
      {content}
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
  head: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  badge: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  badgeText: { fontSize: 12, fontWeight: '800', color: colors.onColor },
  stepName: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, letterSpacing: -0.2 },
  status: { fontSize: 13, fontWeight: '700', color: colors.muted },
  card: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  line: { borderTopWidth: 1, borderTopColor: colors.border },
  // Delegation: your next handoff, highlighted (warm cream with a gold edge).
  focus: { padding: spacing.md + 4, borderRadius: radius.lg, borderWidth: 1.5, borderColor: colors.goldLine },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  tagText: { fontSize: 12, fontWeight: '800', color: colors.accentText, letterSpacing: 0.8, textTransform: 'uppercase' },
  focusName: { fontSize: 22, lineHeight: 28, fontWeight: '800', color: colors.text, letterSpacing: -0.3, marginTop: 6 },
  focusLine: { fontSize: 15, lineHeight: 22, color: colors.text, marginTop: 4 },
  focusHours: { fontWeight: '800', color: colors.accentText },
  focusButton: { marginTop: spacing.md },
  later: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, marginTop: spacing.sm, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
  laterText: { fontSize: 15, fontWeight: '700', color: colors.text },
  times: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  time: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.primary, backgroundColor: colors.surface },
  timeText: { fontSize: 13, fontWeight: '700', color: colors.primaryDark },
  plan: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 2, marginTop: spacing.sm + 2 },
  planText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  // Reminders set, and the other tasks.
  laterRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.sm, paddingHorizontal: spacing.xs },
  laterRowText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.muted },
  restCard: { marginTop: spacing.sm },
  restRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 50 },
  restName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  hours: { fontSize: 13, fontWeight: '600', color: colors.muted },
  small: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.primary },
  smallText: { fontSize: 13, fontWeight: '700', color: colors.onColor },
  link: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', paddingTop: spacing.sm + 2, paddingBottom: spacing.xs, paddingHorizontal: spacing.xs },
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
