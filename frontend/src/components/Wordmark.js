import Svg, { Circle, Path } from 'react-native-svg';
import { WORDMARK_DOT, WORDMARK_PATH, WORDMARK_VIEWBOX } from '../constants/brandPaths';
import { brand } from '../theme';

const ASPECT = 189.02 / 72;

/** The "lifeora" wordmark. The dot of the i is always Warm Apricot; `color` sets the letters. */
export default function Wordmark({ height = 32, color = brand.ink }) {
  return (
    <Svg width={height * ASPECT} height={height} viewBox={WORDMARK_VIEWBOX} accessibilityRole="image" accessibilityLabel="Lifeora">
      <Path d={WORDMARK_PATH} fill={color} />
      <Circle cx={WORDMARK_DOT.cx} cy={WORDMARK_DOT.cy} r={WORDMARK_DOT.r} fill={brand.apricot} />
    </Svg>
  );
}
