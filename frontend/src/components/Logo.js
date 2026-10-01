import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { brand } from '../theme';

/**
 * Reclaim mark: "Where the hours land." A rounded tile (sky → indigo) holding a white hourglass.
 * The sand falling through it gathers into an orange heart: every hour you buy back
 * lands with the people and things you love.
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

      {/* Hourglass: caps and glass */}
      <Line x1={34} y1={27} x2={86} y2={27} stroke={brand.white} strokeWidth={7} strokeLinecap="round" />
      <Line x1={34} y1={93} x2={86} y2={93} stroke={brand.white} strokeWidth={7} strokeLinecap="round" />
      <Path
        d="M41 28 C41 46 55 52 55 60 C55 68 41 74 41 92 M79 28 C79 46 65 52 65 60 C65 68 79 74 79 92"
        stroke={brand.white}
        strokeWidth={6}
        strokeLinecap="round"
        fill="none"
      />

      {/* The time still ahead */}
      <Path d="M52 45 L68 45 C66.5 49 62 51.5 60 54 C58 51.5 53.5 49 52 45 Z" fill={brand.white} opacity={0.6} />

      {/* Falling grains that land as a heart */}
      <Circle cx={60} cy={64} r={1.8} fill={brand.orange} />
      <Circle cx={60} cy={69} r={1.8} fill={brand.orange} />
      <Path
        d="M60 88.5 C52.7 83.5 49 80 49 76.4 C49 73.7 51 71.8 53.5 71.8 C56.3 71.8 58.4 73.5 60 75.6 C61.6 73.5 63.7 71.8 66.5 71.8 C69 71.8 71 73.7 71 76.4 C71 80 67.3 83.5 60 88.5 Z"
        fill={brand.orange}
      />
    </Svg>
  );
}
