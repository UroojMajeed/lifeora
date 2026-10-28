import { Text, View } from 'react-native';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { useStyles } from '../theme/ThemeContext';
import { brand, spacing } from '../theme';

// The four steps of the Buyback Loop as tiles: a number, a small drawing, and a name.
const GREEN = { bg: '#E6F4EF', num: '#7FB3A6', blob: '#D3EBE2' };
const PEACH = { bg: '#FCF0E2', num: '#D9A66A', blob: '#F8E2C8' };
const LIGHT = '#8CC5B5';
const LEAF = '#2E8F7E';
const ink = brand.evergreen;
const sun = brand.apricot;

const Rays = ({ x, y }) => (
  <>
    <Line x1={x} y1={y} x2={x + 3} y2={y - 9} stroke={sun} strokeWidth={3.5} strokeLinecap="round" />
    <Line x1={x + 8} y1={y + 6} x2={x + 16} y2={y} stroke={sun} strokeWidth={3.5} strokeLinecap="round" />
    <Line x1={x + 11} y1={y + 16} x2={x + 21} y2={y + 14} stroke={sun} strokeWidth={3.5} strokeLinecap="round" />
  </>
);

function Clock({ blob }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Ellipse cx={44} cy={52} rx={34} ry={26} fill={blob} />
      <Circle cx={62} cy={46} r={31} fill="none" stroke={ink} strokeWidth={4.5} />
      {[[62, 21, 62, 25], [87, 46, 83, 46], [62, 71, 62, 67], [37, 46, 41, 46]].map(([a, b, c, d], i) => (
        <Line key={i} x1={a} y1={b} x2={c} y2={d} stroke={ink} strokeWidth={3} strokeLinecap="round" />
      ))}
      <Line x1={62} y1={46} x2={62} y2={30} stroke={ink} strokeWidth={4} strokeLinecap="round" />
      <Line x1={62} y1={46} x2={74} y2={46} stroke={ink} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={62} cy={46} r={4.5} fill={sun} />
      <Rays x={88} y={14} />
    </Svg>
  );
}

function Bars({ blob }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Path d="M18 62 C14 36 40 22 64 26 C86 30 96 50 86 66 C74 82 24 84 18 62 Z" fill={blob} />
      <Rect x={34} y={50} width={12} height={28} rx={6} fill={LIGHT} />
      <Rect x={52} y={36} width={12} height={42} rx={6} fill={ink} />
      <Rect x={70} y={20} width={12} height={58} rx={6} fill={ink} />
      <Circle cx={86} cy={64} r={16} fill={sun} />
      <Line x1={86} y1={64} x2={86} y2={55} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      <Line x1={86} y1={64} x2={92} y2={68} stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round" />
      <Rays x={90} y={14} />
    </Svg>
  );
}

function People({ blob }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Path d="M14 58 C10 30 40 14 72 20 C100 26 106 52 92 66 C76 82 20 84 14 58 Z" fill={blob} />
      <Circle cx={36} cy={50} r={11} fill={ink} />
      <Path d="M18 82 C18 66 54 66 54 82 Z" fill={ink} />
      <Circle cx={88} cy={50} r={11} fill={LIGHT} />
      <Path d="M70 82 C70 66 106 66 106 82 Z" fill={LIGHT} />
      <Path d="M40 30 C52 16 72 14 86 24" fill="none" stroke={sun} strokeWidth={4} strokeLinecap="round" />
      <Path d="M76 18 L87 25 L78 33" fill="none" stroke={sun} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function Sprout({ blob }) {
  return (
    <Svg width="100%" height="100%" viewBox="0 0 120 90">
      <Ellipse cx={42} cy={58} rx={30} ry={22} fill={blob} />
      <Path d="M60 80 C60 64 60 54 60 46" fill="none" stroke={ink} strokeWidth={3} strokeLinecap="round" />
      <Path d="M60 56 C46 56 30 46 28 28 C46 26 60 38 60 56 Z" fill={LEAF} />
      <Path d="M60 56 C76 56 92 44 92 26 C74 26 60 38 60 56 Z" fill={LEAF} opacity={0.85} />
      <Path d="M60 56 C52 50 42 40 36 32" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <Path d="M60 56 C68 50 78 40 84 32" fill="none" stroke={ink} strokeWidth={2} strokeLinecap="round" />
      <Path d="M38 82 C46 72 74 72 82 82 Z" fill={ink} />
      <Line x1={60} y1={6} x2={60} y2={15} stroke={sun} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={46} y1={11} x2={51} y2={18} stroke={sun} strokeWidth={3.5} strokeLinecap="round" />
      <Line x1={74} y1={11} x2={69} y2={18} stroke={sun} strokeWidth={3.5} strokeLinecap="round" />
    </Svg>
  );
}

const TILES = [
  { n: '01', label: 'Know your worth', tone: GREEN, Art: Clock },
  { n: '02', label: 'Time and energy audit', tone: PEACH, Art: Bars },
  { n: '03', label: 'Delegation', tone: PEACH, Art: People },
  { n: '04', label: 'Reinvest', tone: GREEN, Art: Sprout },
];

export default function JourneyTiles() {
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.grid} accessibilityRole="list">
      {TILES.map(({ n, label, tone, Art }) => (
        <View key={n} style={[styles.tile, { backgroundColor: tone.bg }]} accessible accessibilityLabel={`Step ${Number(n)}: ${label}`}>
          <Text style={[styles.num, { color: tone.num }]}>{n}</Text>
          <View style={styles.art}>
            <Art blob={tone.blob} />
          </View>
          <Text style={styles.label}>{label}</Text>
        </View>
      ))}
    </View>
  );
}

const makeStyles = (colors) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: spacing.sm + 4, marginTop: spacing.lg },
  tile: { width: '48.4%', aspectRatio: 0.95, borderRadius: 22, padding: spacing.md, justifyContent: 'space-between' },
  num: { fontSize: 15, fontWeight: '700' },
  art: { flex: 1, marginVertical: 4 },
  label: { fontSize: 16, lineHeight: 20, fontWeight: '700', color: colors.text },
});
