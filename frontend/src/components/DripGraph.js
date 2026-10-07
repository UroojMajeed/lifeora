import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { DRIP, MONEY_LEVELS, MONEY_SPLIT, dollars, moneyOf, quadrantFor, valueForMoney } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius } from '../theme';

const Y_AXIS = 40; // room for the $ labels
const X_AXIS = 22; // room for the energy labels
const SPRING = { damping: 16, stiffness: 140, mass: 0.8 };

const shortName = (s) => (s.length > 14 ? `${s.slice(0, 13)}…` : s);
const dotSize = (hours) => Math.max(16, Math.min(34, 12 + hours * 5));

/** One activity on the graph. New dots fly in from the middle; changed ones glide to their new spot. */
function Dot({ item, x, y, origin, color, selected, labelWidth, onPress }) {
  const { colors } = useTheme();
  const size = dotSize(item.hours);
  const px = useSharedValue(origin.x);
  const py = useSharedValue(origin.y);
  const scale = useSharedValue(0);

  useEffect(() => {
    px.value = withSpring(x, SPRING);
    py.value = withSpring(y, SPRING);
    scale.value = withSpring(1, SPRING);
  }, [x, y, px, py, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: px.value - labelWidth / 2 }, { translateY: py.value - size / 2 }, { scale: scale.value }],
  }));

  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: labelWidth, alignItems: 'center' }, style]}>
      <Pressable
        onPress={onPress}
        hitSlop={8}
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
      <Text
        numberOfLines={1}
        style={{ fontSize: 10, fontWeight: selected ? '800' : '600', color: colors.text, marginTop: 2, maxWidth: labelWidth }}
      >
        {shortName(item.activity)}
      </Text>
    </Animated.View>
  );
}

/**
 * The DRIP Matrix as a graph, like in the book: money goes up ($ to $$$$$), energy goes across
 * (drains → energizes). Only rated activities (money and energy set) are plotted.
 */
export default function DripGraph({ items, selected, onSelect, height = 300 }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);

  const plotW = Math.max(0, width - Y_AXIS);
  const plotH = height - X_AXIS;
  const rowH = plotH / MONEY_LEVELS.length;
  const half = plotW / 2;
  const splitY = plotH - (MONEY_SPLIT - 1) * rowH; // between $$ and $$$
  const rowCenter = (money) => plotH - (money - 0.5) * rowH;

  // Group dots that share a cell (same $ and same side) and spread them across it.
  const rated = items.filter((it) => it.energy && (it.money || it.value));
  const cells = {};
  rated.forEach((it) => {
    const key = `${moneyOf(it)}-${it.energy}`;
    (cells[key] = cells[key] || []).push(it);
  });

  const QUADS = [
    { key: 'replacement', left: 0, top: 0, h: splitY },
    { key: 'production', left: half, top: 0, h: splitY },
    { key: 'delegation', left: 0, top: splitY, h: plotH - splitY },
    { key: 'investment', left: half, top: splitY, h: plotH - splitY },
  ];

  return (
    <View style={{ height }} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {/* $ labels */}
      {MONEY_LEVELS.map((m) => (
        <Text key={m} style={[styles.yLabel, { top: rowCenter(m) - 8 }, m >= MONEY_SPLIT && styles.yLabelHigh]}>
          {dollars(m)}
        </Text>
      ))}

      <View style={[styles.plot, { left: Y_AXIS, width: plotW, height: plotH }]}>
        {QUADS.map((q) => {
          const d = DRIP[q.key];
          const top = q.top < splitY;
          return (
            <View
              key={q.key}
              style={[styles.quad, { left: q.left, top: q.top, width: half, height: q.h, backgroundColor: colors[d.soft] }]}
            >
              <Text style={[styles.quadName, { color: colors[d.color] }, !top && styles.quadNameBottom]}>{d.name}</Text>
            </View>
          );
        })}
        {/* The two lines that make the four quadrants */}
        <View style={[styles.vLine, { left: half - 1, height: plotH }]} />
        <View style={[styles.hLine, { top: splitY - 1, width: plotW }]} />

        {width
          ? Object.values(cells).flatMap((group) =>
              group.map((it, k) => {
                const right = it.energy === 'energizing';
                const slot = half / (group.length + 1);
                const x = (right ? half : 0) + slot * (k + 1);
                const y = rowCenter(moneyOf(it));
                const value = it.money ? valueForMoney(it.money) : it.value;
                const color = colors[DRIP[quadrantFor({ value, energy: it.energy })].color];
                return (
                  <Dot
                    key={it.activity}
                    item={it}
                    x={x}
                    y={y}
                    origin={{ x: half, y: splitY }}
                    color={color}
                    selected={selected === it.activity}
                    labelWidth={Math.min(84, Math.max(48, slot * 1.6))}
                    onPress={() => onSelect?.(it.activity)}
                  />
                );
              })
            )
          : null}
      </View>

      <View style={[styles.xAxis, { left: Y_AXIS, width: plotW, top: plotH + 4 }]}>
        <Text style={styles.xLabel}>← Drains me</Text>
        <Text style={styles.xLabel}>Energizes me →</Text>
      </View>
    </View>
  );
}

const makeStyles = (colors) => ({
  plot: { position: 'absolute', top: 0, borderRadius: radius.md, overflow: 'hidden' },
  quad: { position: 'absolute', padding: 6 },
  quadName: { fontSize: 10, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.8, opacity: 0.85 },
  quadNameBottom: { position: 'absolute', bottom: 6, left: 6 },
  vLine: { position: 'absolute', top: 0, width: 2, backgroundColor: colors.surface },
  hLine: { position: 'absolute', left: 0, height: 2, backgroundColor: colors.surface },
  yLabel: { position: 'absolute', left: 0, width: Y_AXIS - 6, textAlign: 'right', fontSize: 11, fontWeight: '700', color: colors.muted },
  yLabelHigh: { color: colors.text },
  xAxis: { position: 'absolute', flexDirection: 'row', justifyContent: 'space-between' },
  xLabel: { fontSize: 11, fontWeight: '700', color: colors.muted },
});
