import { useEffect } from 'react';
import Svg, { Path, Rect } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import { ARC, RING_PATH } from '../constants/brandPaths';
import { brand } from '../theme';

const AnimatedPath = Animated.createAnimatedComponent(Path);

// From lifeora-icon-animated.svg: the apricot arc waits just off the ring, glides into place
// (time being reclaimed), rests there, then eases back out. 5s loop.
const DURATION = 5000;
const KEY_TIMES = [0, 0.15, 0.4, 0.85, 1];
const OFFSETS = [
  [-8, 8],
  [-8, 8],
  [0, 0],
  [0, 0],
  [-8, 8],
];
const EASINGS = [
  Easing.linear,
  Easing.bezierFn(0.3, 0, 0.2, 1),
  Easing.linear,
  Easing.bezierFn(0.6, 0, 0.8, 1),
];

/** The Lifeora icon with its looping "arc returns" animation. */
export default function AnimatedLogo({ size = 128 }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: DURATION, easing: Easing.linear }), -1, false);
  }, [progress]);

  const arcProps = useAnimatedProps(() => {
    const t = progress.value;
    let i = 0;
    while (i < KEY_TIMES.length - 2 && t >= KEY_TIMES[i + 1]) i += 1;
    const span = KEY_TIMES[i + 1] - KEY_TIMES[i];
    const k = EASINGS[i](span > 0 ? (t - KEY_TIMES[i]) / span : 0);
    const dx = OFFSETS[i][0] + (OFFSETS[i + 1][0] - OFFSETS[i][0]) * k;
    const dy = OFFSETS[i][1] + (OFFSETS[i + 1][1] - OFFSETS[i][1]) * k;
    return { d: `M${ARC.x1 + dx} ${ARC.y1 + dy} A22 22 0 0 1 ${ARC.x2 + dx} ${ARC.y2 + dy}` };
  });

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" accessibilityRole="image" accessibilityLabel="Lifeora logo">
      <Rect width={100} height={100} rx={22} fill={brand.evergreen} />
      <Path d={RING_PATH} fill="none" stroke={brand.white} strokeWidth={8.5} strokeLinecap="round" />
      <AnimatedPath animatedProps={arcProps} fill="none" stroke={brand.apricot} strokeWidth={8.5} strokeLinecap="round" />
    </Svg>
  );
}
