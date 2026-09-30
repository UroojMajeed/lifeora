import Svg, { Circle, Line, Path, Polygon } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Reclaim mark: a clock (your time) wrapped by an orange arrow looping back
 * around it (the Buyback Loop: audit → transfer → fill). Hands sit at 10:10.
 */
export default function Logo({ size = 120 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityRole="image" accessibilityLabel="Reclaim logo">
      {/* Buyback loop */}
      <Path
        d="M86 15 A52 52 0 1 1 34 15"
        stroke={colors.accent}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Polygon points="45.5,8.4 36.9,22.2 29.9,10" fill={colors.accent} />

      {/* Clock face */}
      <Circle cx={60} cy={60} r={36} fill={colors.white} stroke={colors.primary} strokeWidth={5} />
      <Line x1={60} y1={30} x2={60} y2={36} stroke={colors.navy} strokeWidth={3} strokeLinecap="round" />
      <Line x1={90} y1={60} x2={84} y2={60} stroke={colors.navy} strokeWidth={3} strokeLinecap="round" />
      <Line x1={60} y1={90} x2={60} y2={84} stroke={colors.navy} strokeWidth={3} strokeLinecap="round" />
      <Line x1={30} y1={60} x2={36} y2={60} stroke={colors.navy} strokeWidth={3} strokeLinecap="round" />

      {/* Hands */}
      <Line x1={60} y1={60} x2={45.3} y2={49.7} stroke={colors.navy} strokeWidth={5} strokeLinecap="round" />
      <Line x1={60} y1={60} x2={81} y2={47.9} stroke={colors.navy} strokeWidth={4} strokeLinecap="round" />
      <Circle cx={60} cy={60} r={5} fill={colors.accent} />
    </Svg>
  );
}
