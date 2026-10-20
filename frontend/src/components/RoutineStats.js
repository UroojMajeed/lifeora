import { useEffect, useState } from 'react';
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { WORKDAYS_PER_WEEK } from '../constants/home';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';
import CardHeader, { homeCard } from './CardHeader';

// The four quadrants in the book's order of value; the two that drain you are marked under the graph.
const ORDER = ['production', 'replacement', 'investment', 'delegation'];
const DRAINS = new Set(['replacement', 'delegation']);
const ICONS = { production: 'flash', replacement: 'repeat', investment: 'trending-up', delegation: 'people' };
const PLOT = 200; // the tracks' height, in px
const MIN = 52; // the shortest column with hours: still carries its % and hours inside
const ICON_ROOM = 34; // room at the top of each track for its icon

const quadrantOf = (it) => it.quadrant || quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy });
const h = (n) => `${Math.round(n * 10) / 10} h`;

/** A column that rises when Home opens (one after another). */
function Column({ height, index, color, children }) {
  const rise = useSharedValue(0);
  useEffect(() => {
    rise.value = withDelay(index * 90, withTiming(height, { duration: 650, easing: Easing.out(Easing.cubic) }));
  }, [height, index, rise]);
  const style = useAnimatedStyle(() => ({ height: rise.value }));
  return (
    <Animated.View style={[colStyles.col, style]}>
      <LinearGradient colors={[`${color}B3`, color]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={StyleSheet.absoluteFill} />
      {children}
    </Animated.View>
  );
}

const colStyles = StyleSheet.create({
  col: { borderRadius: 14, overflow: 'hidden', alignItems: 'center', paddingTop: 10 },
});

/**
 * Home's first look on a first visit: your routine. Its size (hours a day, tasks), a column per
 * quadrant in its own track (icon on top, % of the day and hours inside, so even half an hour reads),
 * and the graph said in words. Tap a column: it lights up and its tasks show. `items` is the
 * routine as it is now.
 */
export default function RoutineStats({ items = [], free = 0, tip = true, style }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(null);

  const rated = items.filter((it) => it.energy && it.hours);
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantOf(it)]?.push(it));
  const hoursOf = (k) => by[k].reduce((t, it) => t + it.hours, 0);
  const total = ORDER.reduce((t, k) => t + hoursOf(k), 0);
  const freeHours = free >= 0.25 ? free : 0; // handed off, not reinvested yet
  const day = total + freeHours;
  const max = Math.max(...ORDER.map(hoursOf), 0.5);
  const room = PLOT - ICON_ROOM - 8;
  const heightOf = (hours) => (hours ? MIN + (hours / max) * (room - MIN) : 0);

  const draining = rated.filter((it) => it.energy === 'draining');
  const drainHours = draining.reduce((t, it) => t + it.hours, 0);
  const biggest = [...draining].sort((a, b) => b.hours - a.hours)[0];

  const toggle = (k) => {
    Haptics.selectionAsync().catch(() => {});
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((cur) => (cur === k ? null : k));
  };

  return (
    <LinearGradient colors={colors.calm} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, style]}>
      <CardHeader
        icon="stats-chart"
        iconColor={colors.primary}
        title="Your Routine"
        sub={`${h(day)} a day · ${rated.length} ${rated.length === 1 ? 'task' : 'tasks'}`}
      />

      {/* The graph: a track per quadrant, its column rising inside it. */}
      <View style={styles.columns}>
        {ORDER.map((k, i) => {
          const hours = hoursOf(k);
          const on = open === k;
          const share = day ? Math.round((hours / day) * 100) : 0;
          return (
            <Pressable
              key={k}
              onPress={() => toggle(k)}
              accessibilityRole="button"
              accessibilityState={{ expanded: on }}
              accessibilityLabel={`${DRIP[k].name}: ${formatHours(hours)} a day, ${share}% of your day${DRAINS.has(k) ? ', drains you' : ''}. Tap to see its tasks.`}
              style={({ pressed }) => [styles.slot, pressed && styles.pressed]}
            >
              <View style={[styles.track, on && { borderColor: colors.chart[k], backgroundColor: `${colors.chart[k]}22` }]}>
                <View style={styles.iconWrap}>
                  <Ionicons name={ICONS[k]} size={16} color={colors.chart[k]} />
                </View>
                {hours ? (
                  <Column height={heightOf(hours)} index={i} color={colors.chart[k]}>
                    <Text style={styles.share}>{share}%</Text>
                    <Text style={styles.hours}>{formatHours(hours)}</Text>
                  </Column>
                ) : (
                  <Text style={styles.zero}>0 h</Text>
                )}
              </View>
              <Text style={[styles.xName, on && { color: colors.chart[k] }]} numberOfLines={1} adjustsFontSizeToFit>
                {DRIP[k].name}
              </Text>
              {DRAINS.has(k) ? <Text style={styles.xDrains}>drains</Text> : <Text style={styles.xEnergy}>energizes</Text>}
            </Pressable>
          );
        })}
      </View>

      {freeHours ? (
        <View style={styles.free}>
          <Ionicons name="hourglass-outline" size={14} color={colors.accentText} />
          <Text style={styles.freeText}>
            <Text style={styles.freeStrong}>
              {h(freeHours)} freed · {Math.round((freeHours / day) * 100)}%
            </Text>{' '}
            of your day, waiting to be reinvested
          </Text>
        </View>
      ) : null}

      {open ? (
        <Animated.View key={open} entering={FadeIn.duration(250)} style={[styles.tasks, { borderLeftColor: colors.chart[open] }]}>
          <Text style={styles.tasksName}>
            {DRIP[open].name} · {by[open].length} {by[open].length === 1 ? 'task' : 'tasks'}
          </Text>
          {by[open].length ? (
            <View style={styles.chips}>
              {[...by[open]]
                .sort((a, b) => b.hours - a.hours)
                .map((t) => (
                  <View key={t.activity} style={styles.chip}>
                    <Text style={styles.chipText} numberOfLines={1}>
                      {t.activity} <Text style={styles.chipHours}>{formatHours(t.hours)}</Text>
                    </Text>
                  </View>
                ))}
            </View>
          ) : (
            <Text style={styles.empty}>No tasks here.</Text>
          )}
        </Animated.View>
      ) : (
        <View style={styles.hintRow}>
          <Ionicons name="hand-left-outline" size={12} color={colors.muted} />
          <Text style={styles.hint}>Tap a column to see its tasks</Text>
        </View>
      )}

      {/* The graph, said in words. */}
      {tip && biggest ? (
        <View style={styles.insight}>
          <View style={styles.insightIcon}>
            <Ionicons name="battery-dead" size={16} color="#FFFFFF" />
          </View>
          <View style={styles.insightBody}>
            <Text style={styles.insightStrong}>{h(drainHours)} a day drains you</Text>
            <Text style={styles.insightText}>
              Hand off {biggest.activity.toLowerCase()}: +{h(biggest.hours * WORKDAYS_PER_WEEK)} a week
            </Text>
          </View>
        </View>
      ) : null}
    </LinearGradient>
  );
}

const makeStyles = (colors, isDark) => ({
  card: homeCard(colors, isDark),
  // The graph: four tracks, each with its column at the bottom.
  columns: { flexDirection: 'row', gap: 10, marginTop: spacing.md },
  slot: { flex: 1, alignItems: 'center', minWidth: 0 },
  pressed: { transform: [{ scale: 0.97 }] },
  track: {
    alignSelf: 'stretch',
    height: PLOT,
    justifyContent: 'flex-end',
    padding: 4,
    borderRadius: 18,
    backgroundColor: colors.calmTrack,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  iconWrap: { position: 'absolute', top: 8, left: 0, right: 0, alignItems: 'center' },
  share: { fontSize: 16, fontWeight: '800', color: '#FFFFFF', letterSpacing: -0.3 },
  hours: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.88)', marginTop: 1 },
  xName: { fontSize: 10, fontWeight: '800', color: colors.text, marginTop: 8, letterSpacing: -0.2 },
  zero: { alignSelf: 'center', marginBottom: spacing.sm, fontSize: 12, fontWeight: '700', color: colors.muted },
  free: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md, paddingHorizontal: spacing.sm + 4, paddingVertical: spacing.sm, borderRadius: radius.md, backgroundColor: colors.accentSoft, borderWidth: 1, borderColor: colors.accent },
  freeText: { flex: 1, fontSize: 13, color: colors.text },
  freeStrong: { fontWeight: '800', color: colors.accentText },
  xDrains: { fontSize: 10, fontWeight: '700', color: colors.error, marginTop: 1 },
  xEnergy: { fontSize: 10, fontWeight: '600', color: colors.muted, marginTop: 1 },
  hintRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: spacing.sm + 2 },
  hint: { fontSize: 11, color: colors.muted },
  // The picked quadrant's tasks.
  tasks: { marginTop: spacing.md, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.calmTrack, borderLeftWidth: 4 },
  tasksName: { fontSize: 13, fontWeight: '800', color: colors.text },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.sm },
  chip: { maxWidth: '100%', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, backgroundColor: colors.surface },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.text },
  chipHours: { fontWeight: '500', color: colors.muted },
  empty: { fontSize: 12, color: colors.muted, marginTop: 4 },
  // The insight: the graph in words.
  insight: { flexDirection: 'row', gap: spacing.sm + 2, alignItems: 'center', marginTop: spacing.md, padding: spacing.sm + 4, borderRadius: radius.md, backgroundColor: colors.errorSoft },
  insightIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.error },
  insightBody: { flex: 1, minWidth: 0 },
  insightStrong: { fontSize: 15, fontWeight: '800', color: colors.error },
  insightText: { fontSize: 13, fontWeight: '600', color: colors.text, marginTop: 1 },
});
