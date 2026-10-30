import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { brand, radius, spacing } from '../theme';

const ROW = 112; // from one stop to the next
const TOP = 30; // the first stop's centre
const SIDE = 40; // a stop's centre, in from the edge
const NODE = 36;
const NODE_NOW = 44;
const BEND = 0.55; // how far the road runs straight down out of each stop before it turns
// The road itself: light grey ahead, teal where you've been (with apricot ticks on the finished stops).
const ROAD_AHEAD = '#E2E8E6';
const LINE_AHEAD = '#C3CECA';
const LINE_DONE = '#FFFFFF';

/**
 * The handoff as a winding road: one stop per step at the bends (left, right, left…), the road
 * light grey ahead and teal as far as you've got, down to the sun. Done stops and the current one open their step;
 * later ones wait. `summaryOf(step)` is the line under a done step; `hours` a day the task frees.
 */
export default function WindingRoad({ steps, current, onOpen, summaryOf, hours }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [width, setWidth] = useState(0);
  const finished = !current;
  const n = steps.length;

  const point = (i) => ({ x: i % 2 ? width - SIDE : SIDE, y: TOP + i * ROW });
  const sun = { x: width / 2, y: TOP + n * ROW };
  const points = [...steps.map((_, i) => point(i)), sun];
  // A smooth road through the points: out of each one straight down, then across to the next.
  const roadTo = (last) =>
    points.slice(0, last + 1).reduce((d, p, i) => {
      if (!i) return `M ${p.x} ${p.y}`;
      const a = points[i - 1];
      const bend = (p.y - a.y) * BEND;
      return `${d} C ${a.x} ${a.y + bend} ${p.x} ${p.y - bend} ${p.x} ${p.y}`;
    }, '');
  const whole = roadTo(points.length - 1);
  const reached = finished ? points.length - 1 : steps.indexOf(current);
  const height = sun.y + 110;

  return (
    <View style={[styles.wrap, { height }]} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width ? (
        <>
          <Svg width={width} height={height} style={styles.svg} pointerEvents="none">
            <Path d={whole} stroke={ROAD_AHEAD} strokeWidth={26} strokeLinecap="round" fill="none" />
            <Path d={whole} stroke={LINE_AHEAD} strokeWidth={2} strokeDasharray="8 10" fill="none" />
            {reached > 0 ? (
              <>
                <Path d={roadTo(reached)} stroke={colors.primary} strokeWidth={26} strokeLinecap="round" fill="none" />
                <Path d={roadTo(reached)} stroke={LINE_DONE} strokeWidth={2} strokeDasharray="8 10" fill="none" />
              </>
            ) : null}
          </Svg>

          {steps.map((s, i) => {
            const p = point(i);
            const right = i % 2 === 1;
            const now = current?.id === s.id;
            const locked = !s.done && !now;
            const size = now ? NODE_NOW : NODE;
            return (
              <View key={s.id}>
                <View style={[styles.node, { left: p.x - size / 2, top: p.y - size / 2, width: size, height: size, borderRadius: size / 2 }, s.done && styles.nodeDone, now && styles.nodeNow]}>
                  {s.done ? <Ionicons name="checkmark" size={18} color={brand.evergreen} /> : <Text style={[styles.nodeNum, now && styles.nodeNumNow]}>{i + 1}</Text>}
                </View>
                <Pressable
                  onPress={() => onOpen(s.id)}
                  disabled={locked}
                  accessibilityRole="button"
                  accessibilityLabel={`Step ${i + 1}, ${s.title}${s.done ? ', done' : now ? ', next' : ', later'}`}
                  style={({ pressed }) => [
                    styles.label,
                    { top: p.y - 26, maxWidth: width * 0.62 },
                    right ? { right: SIDE + NODE / 2 + 10, alignItems: 'flex-end' } : { left: SIDE + NODE / 2 + 10 },
                    now && styles.labelNow,
                    locked && styles.labelLater,
                    pressed && styles.pressed,
                  ]}
                >
                  <View style={[styles.titleRow, right && styles.titleRowRight]}>
                    <Text style={[styles.title, locked && styles.muted]} numberOfLines={2}>
                      {s.title}
                    </Text>
                    {s.kind === 'custom' ? <Text style={styles.yours}>Yours</Text> : null}
                  </View>
                  {s.done ? (
                    <Text style={[styles.sub, right && styles.subRight]} numberOfLines={1}>
                      {summaryOf(s)}
                    </Text>
                  ) : now ? (
                    <View style={styles.go}>
                      <Text style={styles.goText}>{steps.some((x) => x.done) ? 'Continue' : 'Start'}</Text>
                      <Ionicons name="arrow-forward" size={14} color={brand.evergreen} />
                    </View>
                  ) : (
                    <Text style={[styles.sub, right && styles.subRight]}>{i === n - 1 ? 'Last step' : 'Later'}</Text>
                  )}
                </Pressable>
              </View>
            );
          })}

          {/* The destination. */}
          <View style={[styles.sun, { left: sun.x - 30, top: sun.y - 30 }, finished && styles.sunOn]}>
            <Ionicons name="sunny" size={28} color={finished ? '#FFFFFF' : brand.evergreen} />
          </View>
          <View style={[styles.dest, { top: sun.y + 38 }]}>
            <Text style={styles.destTitle}>{finished ? 'Off your plate!' : 'Off your plate'}</Text>
            <Text style={styles.destLine}>+{Math.round(hours * 5 * 10) / 10} h a week back</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  wrap: { marginTop: spacing.sm },
  svg: { position: 'absolute', left: 0, top: 0 },
  pressed: { opacity: 0.85 },
  muted: { color: colors.muted },
  node: { position: 'absolute', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.borderStrong },
  nodeDone: { backgroundColor: brand.apricot, borderColor: brand.apricot },
  nodeNow: { borderWidth: 3, borderColor: brand.apricot, backgroundColor: colors.accentSoft },
  nodeNum: { fontSize: 14, fontWeight: '800', color: colors.muted },
  nodeNumNow: { fontSize: 16, color: colors.accentText },
  label: {
    position: 'absolute',
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    shadowColor: '#0A1716',
    shadowOpacity: isDark ? 0.4 : 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  labelNow: { borderWidth: 2, borderColor: brand.apricot },
  labelLater: { opacity: 0.85 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  titleRowRight: { flexDirection: 'row-reverse' },
  title: { flexShrink: 1, fontSize: 15, fontWeight: '800', color: colors.text },
  yours: { fontSize: 11, fontWeight: '800', color: colors.accentText },
  sub: { fontSize: 12, color: colors.muted, marginTop: 2 },
  subRight: { textAlign: 'right' },
  go: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: radius.pill, backgroundColor: brand.apricot },
  goText: { fontSize: 13, fontWeight: '800', color: brand.evergreen },
  sun: { position: 'absolute', width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFE3A8', borderWidth: 8, borderColor: 'rgba(245,185,113,0.35)' },
  sunOn: { backgroundColor: brand.apricot },
  dest: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  destTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  destLine: { fontSize: 13, fontWeight: '700', color: colors.accentText, marginTop: 2 },
});
