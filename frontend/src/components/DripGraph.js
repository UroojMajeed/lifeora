import { useState } from 'react';
import { LayoutAnimation, Pressable, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { DRIP, quadrantFor, valueForMoney } from '../constants/content';
import { formatHours } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const Y_AXIS = 28; // the money arrow on the left
const X_AXIS = 30; // the energy arrow along the bottom
const LINE = 1.5; // the frame and the cross that divides it
const LABEL = 26; // room for each box's name, above its chips
const CHIP = 26; // one chip's line (height + gap)

// The book's matrix: money up the side, energy across. Top row makes money, right column energizes.
const BOXES = [
  { key: 'replacement', row: 0, col: 0 },
  { key: 'production', row: 0, col: 1 },
  { key: 'delegation', row: 1, col: 0 },
  { key: 'investment', row: 1, col: 1 },
];

/**
 * The DRIP Matrix drawn like the book: one box split into four quadrants (cream, gold dotted lines),
 * money rising up the side and energy growing to the right. Each rated task sits in its quadrant as
 * a chip with its name. When a quadrant has more tasks than fit, its last line is "See all N", which
 * opens that quadrant's full list under the graph. Tapping a chip calls `onSelect(activity)`.
 * `stagger` (ms): chips fade in one after another (the end-of-rating reveal).
 */
export default function DripGraph({ items, selected, onSelect, stagger = 0, height = 320 }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const [openQuadrant, setOpenQuadrant] = useState(null); // the quadrant whose full list is open

  const plotW = Math.max(0, width - Y_AXIS);
  const plotH = height - X_AXIS;
  const boxW = plotW / 2;
  const boxH = plotH / 2;
  const fit = Math.max(1, Math.floor((boxH - LABEL - 6) / CHIP)); // chip lines that fit in a quadrant

  const rated = items.filter((it) => it.energy && (it.money || it.value));
  const by = { production: [], replacement: [], investment: [], delegation: [] };
  rated.forEach((it) => by[quadrantFor({ value: it.money ? valueForMoney(it.money) : it.value, energy: it.energy })].push(it));

  const toggleAll = (key) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpenQuadrant((cur) => (cur === key ? null : key));
  };

  const chip = (it, q, i) => {
    const on = selected === it.activity;
    return (
      <Animated.View key={it.activity} entering={FadeIn.duration(250).delay(stagger ? stagger * rated.indexOf(it) : 0)}>
        <Pressable
          onPress={() => onSelect?.(it.activity)}
          accessibilityRole="button"
          accessibilityLabel={`${it.activity}, ${q.name}. Tap to change.`}
          style={({ pressed }) => [styles.chip, { borderColor: on ? colors.text : colors[q.color] }, on && styles.chipOn, pressed && { opacity: 0.7 }]}
        >
          <View style={[styles.chipDot, { backgroundColor: colors[q.color] }]} />
          <Text style={styles.chipText} numberOfLines={1}>
            {it.activity}
          </Text>
        </Pressable>
      </Animated.View>
    );
  };

  const open = openQuadrant ? DRIP[openQuadrant] : null;

  return (
    <View>
      <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        {/* Money axis: an arrow up the left side */}
        <View style={[styles.yAxis, { height: plotH }]}>
          <Ionicons name="caret-up" size={14} color={colors.muted} style={styles.yArrowHead} />
          <Text style={[styles.yEnd, styles.yTop]}>$$$</Text>
          <View style={styles.yLine} />
          <Text style={styles.yWord}>MONEY</Text>
          <Text style={[styles.yEnd, styles.yBottom]}>$</Text>
        </View>

        <View style={[styles.plot, { left: Y_AXIS, width: plotW, height: plotH }]}>
          {/* One warm cream sheet behind the whole graph (the same cream as the rating card). */}
          <LinearGradient colors={colors.cream} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.sheet, { width: plotW, height: plotH }]} />

          {/* The frame, and dotted lines from the centre that divide it into the four quadrants. */}
          <View pointerEvents="none" style={[styles.frame, { width: plotW, height: plotH }]} />
          {width ? (
            <Svg pointerEvents="none" width={plotW} height={plotH} style={styles.dividers}>
              {[
                [boxW, boxH, boxW, 0],
                [boxW, boxH, boxW, plotH],
                [boxW, boxH, 0, boxH],
                [boxW, boxH, plotW, boxH],
              ].map(([x1, y1, x2, y2]) => (
                <Line key={`${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={colors.gold[1]} strokeWidth={3} strokeDasharray="0.1 7" strokeLinecap="round" />
              ))}
            </Svg>
          ) : null}

          {/* Each quadrant: its name and hours, then its tasks as chips ("See all" when they don't fit). */}
          {width
            ? BOXES.map((b) => {
                const q = DRIP[b.key];
                const tasks = by[b.key];
                const hours = tasks.reduce((t, it) => t + it.hours, 0);
                const overflow = tasks.length > fit;
                const shown = overflow ? tasks.slice(0, fit - 1) : tasks;
                return (
                  <View key={b.key} style={[styles.box, { left: b.col * boxW, top: b.row * boxH, width: boxW, height: boxH }]}>
                    <View style={styles.boxHead}>
                      <Text style={[styles.boxName, { color: colors[q.color] }]} numberOfLines={1} accessibilityHint={q.axes}>
                        {q.name}
                      </Text>
                      {hours ? <Text style={[styles.boxHours, { color: colors[q.color] }]}>{formatHours(hours)}</Text> : null}
                    </View>
                    {shown.map((it, i) => chip(it, q, i))}
                    {overflow ? (
                      <Pressable
                        onPress={() => toggleAll(b.key)}
                        accessibilityRole="button"
                        accessibilityLabel={`See all ${tasks.length} ${q.name} tasks`}
                        style={({ pressed }) => [styles.seeAll, { backgroundColor: colors[q.color] }, pressed && { opacity: 0.8 }]}
                      >
                        <Text style={styles.seeAllText}>See all {tasks.length}</Text>
                        <Ionicons name={openQuadrant === b.key ? 'chevron-up' : 'chevron-down'} size={12} color={colors.onColor} />
                      </Pressable>
                    ) : null}
                  </View>
                );
              })
            : null}
        </View>

        {/* Energy axis: an arrow along the bottom */}
        <View style={[styles.xAxis, { left: Y_AXIS, width: plotW, top: plotH + 6 }]}>
          <View style={styles.xLineRow}>
            <View style={styles.xLine} />
            <Ionicons name="caret-forward" size={14} color={colors.muted} style={styles.xArrowHead} />
          </View>
          <View style={styles.xLabels}>
            <Text style={styles.xLabel}>Drains you</Text>
            <Text style={styles.xWord}>ENERGY</Text>
            <Text style={styles.xLabel}>Energizes you</Text>
          </View>
        </View>
      </View>

      {/* "See all": that quadrant's full list, under the graph. */}
      {open ? (
        <View style={[styles.panel, { borderColor: colors[open.color], backgroundColor: colors[open.soft] }]}>
          <View style={styles.panelHead}>
            <Text style={[styles.panelTitle, { color: colors[open.color] }]}>
              {open.name} · {by[openQuadrant].length} tasks
            </Text>
            <Pressable onPress={() => toggleAll(openQuadrant)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={18} color={colors[open.color]} />
            </Pressable>
          </View>
          <View style={styles.panelChips}>{by[openQuadrant].map((it, i) => chip(it, open, i))}</View>
        </View>
      ) : null}
    </View>
  );
}

const makeStyles = (colors) => ({
  plot: { position: 'absolute', top: 0 },
  box: { position: 'absolute', paddingHorizontal: 8, paddingTop: 6, gap: 4, overflow: 'hidden' },
  boxHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 4, marginBottom: 2 },
  boxName: { flexShrink: 1, fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  boxHours: { fontSize: 11, fontWeight: '800' },
  sheet: { position: 'absolute', left: 0, top: 0, borderRadius: radius.md },
  // A soft gold frame; the dotted dividers inside are the deeper gold.
  frame: { position: 'absolute', left: 0, top: 0, borderRadius: radius.md, borderWidth: LINE, borderColor: colors.goldLine },
  dividers: { position: 'absolute', left: 0, top: 0 },
  // A task: a small white chip with its quadrant's colour on the edge and a dot.
  chip: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 22,
    paddingHorizontal: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    backgroundColor: colors.surface,
  },
  chipOn: { borderWidth: 2 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipText: { flexShrink: 1, fontSize: 12, fontWeight: '700', color: colors.text },
  seeAll: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 3, height: 22, paddingHorizontal: 9, borderRadius: radius.pill },
  seeAllText: { fontSize: 12, fontWeight: '800', color: colors.onColor },
  yAxis: { position: 'absolute', left: 0, top: 0, width: Y_AXIS - 6, alignItems: 'center' },
  yArrowHead: { position: 'absolute', top: -4 },
  // The line runs between the $$$ and $ marks (never under them), so the ends stay clean.
  yLine: { position: 'absolute', top: 26, bottom: 18, width: 2, borderRadius: 1, backgroundColor: colors.border },
  yEnd: { position: 'absolute', fontSize: 10, fontWeight: '800', color: colors.accentText },
  yTop: { top: 8 },
  yBottom: { bottom: 2 },
  yWord: {
    position: 'absolute',
    top: '50%',
    width: 60,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: colors.muted,
    backgroundColor: colors.background,
    transform: [{ translateY: -6 }, { rotate: '-90deg' }],
  },
  xAxis: { position: 'absolute' },
  xLineRow: { flexDirection: 'row', alignItems: 'center' },
  xLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border },
  xArrowHead: { marginLeft: -4 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  xLabel: { fontSize: 10, fontWeight: '700', color: colors.muted },
  xWord: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.muted },
  // The "See all" list under the graph.
  panel: { marginTop: spacing.md, padding: spacing.md, borderRadius: radius.md, borderWidth: 1.5 },
  panelHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  panelTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
  panelChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
});
