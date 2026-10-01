import Svg, { Circle, Defs, Line, LinearGradient, Path, Polygon, Rect, Stop } from 'react-native-svg';
import { brand } from '../theme';

/**
 * Reclaim mark: a rounded app-icon tile (sky → indigo) holding a white clock ring.
 * The ring's arrow runs counter-clockwise, turning time back: the Buyback Loop.
 */
export default function Logo({ size = 120 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityRole="image" accessibilityLabel="Reclaim logo">
      <Defs>
        <LinearGradient id="reclaimTile" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={brand.sky} />
          <Stop offset="1" stopColor={brand.indigo} />
        </LinearGradient>
      </Defs>

      <Rect x={4} y={4} width={112} height={112} rx={32} fill="url(#reclaimTile)" />

      {/* Loop around the clock, open at the top right, arrow pointing back (counter-clockwise) */}
      <Path
        d="M80.57 35.49 A32 32 0 1 1 49.06 29.93"
        stroke={brand.white}
        strokeWidth={8}
        strokeLinecap="round"
        fill="none"
      />
      <Polygon points="73.7,29.7 85.1,30.1 76.1,40.9" fill={brand.white} strokeLinejoin="round" />

      {/* Hands */}
      <Line x1={60} y1={60} x2={60} y2={45} stroke={brand.white} strokeWidth={6} strokeLinecap="round" />
      <Line x1={60} y1={60} x2={71} y2={66} stroke={brand.white} strokeWidth={6} strokeLinecap="round" />
      <Circle cx={60} cy={60} r={5.5} fill={brand.orange} />
    </Svg>
  );
}
