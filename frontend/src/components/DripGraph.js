import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { FadeIn, useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Line } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { DRIP, MONEY_SPLIT, dollars, moneyOf, quadrantFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius } from '../theme';

const Y_AXIS = 28; // the money arrow on the left
const X_AXIS = 30; // the energy arrow along the bottom
const GAP = 0; // one box, split into four (no gaps between the quadrants)
const LINE = 1.5; // the frame and the cross that divides it
const LABEL = 28; // room for each box's name, above its dots
const SPRING = { damping: 18, stiffness: 260, mass: 0.6 }; // quick, so a new dot lands within the short pop-up

const dotSize = (hours) => Math.max(14, Math.min(30, 10 + hours * 5));

// The book's matrix: money up the side, energy across. Top row makes money, right column energizes.
const BOXES = [
  { key: 'replacement', row: 0, col: 0 },
  { key: 'production', row: 0, col: 1 },
  { key: 'delegation', row: 1, col: 0 },
  { key: 'investment', row: 1, col: 1 },
];

/** One activity on the matrix. New dots fly in from the centre; changed ones glide to their new box. */
function Dot({ item, x, y, origin, still, delay = 0, color, selected, onPress }) {
  const { colors } = useTheme();
  const size = dotSize(item.hours);
  const px = useSharedValue(still ? x : origin.x);
  const py = useSharedValue(still ? y : origin.y);
  const scale = useSharedValue(still ? 1 : 0);

  useEffect(() => {
    px.value = withDelay(delay, withSpring(x, SPRING));
    py.value = withDelay(delay, withSpring(y, SPRING));
    scale.value = withDelay(delay, withSpring(selected ? 1.15 : 1, SPRING));
  }, [x, y, selected, px, py, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: px.value - size / 2 }, { translateY: py.value - size / 2 }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, zIndex: selected ? 2 : 1 }, style]}>
      <Pressable
        onPress={onPress}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`${item.activity}: ${dollars(moneyOf(item))}, ${item.energy === 'energizing' ? 'energizes you' : 'drains you'}. Tap to change.`}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: selected ? 3 : 2,
          borderColor: selected ? colors.text : colors.surface,
        }}
      />
    </Animated.View>
  );
}

/** The name of the selected dot, in a small bubble just above it. */
function NameBubble({ name, x, y, plotW }) {
  const styles = useStyles(makeStyles);
  const width = Math.min(150, Math.max(70, name.length * 7 + 20));
  const left = Math.max(0, Math.min(plotW - width, x - width / 2));
  return (
    <Animated.View entering={FadeIn.duration(180)} pointerEvents="none" style={[styles.bubble, { left, top: Math.max(0, y - 46), width }]}>
      <Text style={styles.bubbleText} numberOfLines={1}>
        {name}
      </Text>
    </Animated.View>
  );
}

/**
 * `stagger` (ms): dots fly in one after another in the routine's order (the end-of-rating reveal).
 * The DRIP Matrix drawn like the book: one box split into four quadrants, money rising up the side and energy
 * growing to the right. Rated activities sit in their box as dots (higher = more $, size = hours).
 */
export default function DripGraph({ items, selected, onSelect, flyIn, stagger = 0, height = 320 }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);

  const plotW = Math.max(0, width - Y_AXIS);
  const plotH = height - X_AXIS;
  const boxW = (plotW - GAP) / 2;
  const boxH = (plotH - GAP) / 2;
  const boxLeft = (col) => col * (boxW + GAP);
  const boxTop = (row) => row * (boxH + GAP);

  // Where a $ rating sits inside its box: $$$-$$$$$ share the top row, $-$$ the bottom row.
  const yFor = (money) => {
    const high = money >= MONEY_SPLIT;
    const levels = high ? [5, 4, 3] : [2, 1];
    const pos = levels.indexOf(money);
    const top = boxTop(high ? 0 : 1) + LABEL;
    const room = boxH - LABEL - 6;
    return top + (pos + 0.5) * (room / levels.length);
  };

  let bubble = null; // filled in while placing the dots

  // Spread dots that share a $ level and box across its width.
  const rated = items.filter((it) => it.energy && (it.money || it.value));
  const cells = {};
  rated.forEach((it) => {
    const key = `${moneyOf(it)}-${it.energy}`;
    (cells[key] = cells[key] || []).push(it);
  });

  return (
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
        {BOXES.map((b) => {
          const d = DRIP[b.key];
          return (
            <View
              key={b.key}
              style={[styles.box, { left: boxLeft(b.col), top: boxTop(b.row), width: boxW, height: boxH }]}
            >
              <Text style={[styles.boxName, { color: colors[d.color] }]} accessibilityHint={d.axes}>
                {d.name}
              </Text>
            </View>
          );
        })}

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
              <Line
                key={`${x2}-${y2}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={colors.gold[1]}
                strokeWidth={3}
                strokeDasharray="0.1 7"
                strokeLinecap="round"
              />
            ))}
          </Svg>
        ) : null}

        {width
          ? Object.values(cells).flatMap((group) =>
              group.map((it, k) => {
                const col = it.energy === 'energizing' ? 1 : 0;
                const slot = boxW / (group.length + 1);
                const x = boxLeft(col) + slot * (k + 1);
                const y = yFor(moneyOf(it));
                const value = it.money ? valueForMoney(it.money) : it.value;
                if (selected === it.activity) bubble = { name: it.activity, x, y };
                return (
                  <Dot
                    key={it.activity}
                    item={it}
                    x={x}
                    y={y}
                    origin={{ x: plotW / 2, y: plotH / 2 }}
                    still={Boolean(flyIn) && flyIn !== it.activity}
                    delay={stagger ? stagger * rated.indexOf(it) : 0}
                    color={colors[DRIP[quadrantFor({ value, energy: it.energy })].color]}
                    selected={selected === it.activity}
                    onPress={() => onSelect?.(it.activity)}
                  />
                );
              })
            )
          : null}
        {bubble ? <NameBubble key={bubble.name} {...bubble} plotW={plotW} /> : null}
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
  );
}

const makeStyles = (colors) => ({
  plot: { position: 'absolute', top: 0 },
  box: { position: 'absolute', paddingHorizontal: 8, paddingTop: 6 },
  sheet: { position: 'absolute', left: 0, top: 0, borderRadius: radius.md },
  // A soft gold frame; the dotted dividers inside are the deeper gold.
  frame: { position: 'absolute', left: 0, top: 0, borderRadius: radius.md, borderWidth: LINE, borderColor: colors.goldLine },
  dividers: { position: 'absolute', left: 0, top: 0 },
  boxName: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.6 },
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
  bubble: {
    position: 'absolute',
    zIndex: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.text,
    alignItems: 'center',
  },
  bubbleText: { fontSize: 12, fontWeight: '700', color: colors.background },
  xAxis: { position: 'absolute' },
  xLineRow: { flexDirection: 'row', alignItems: 'center' },
  xLine: { flex: 1, height: 2, borderRadius: 1, backgroundColor: colors.border },
  xArrowHead: { marginLeft: -4 },
  xLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  xLabel: { fontSize: 10, fontWeight: '700', color: colors.muted },
  xWord: { fontSize: 10, fontWeight: '800', letterSpacing: 1.5, color: colors.muted },
});
