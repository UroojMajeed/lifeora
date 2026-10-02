import Svg, { Path, Rect } from 'react-native-svg';
import { RING_PATH, arcPath } from '../constants/brandPaths';
import { brand } from '../theme';

/** Lifeora app icon: an evergreen tile with the open white ring and the apricot arc of reclaimed time. */
export default function Logo({ size = 120 }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel="Lifeora logo">
      <Rect width={100} height={100} rx={22} fill={brand.evergreen} />
      <Path d={RING_PATH} fill="none" stroke={brand.white} strokeWidth={8.5} strokeLinecap="round" />
      <Path d={arcPath()} fill="none" stroke={brand.apricot} strokeWidth={8.5} strokeLinecap="round" />
    </Svg>
  );
}
