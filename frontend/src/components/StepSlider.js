import { useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useStyles, useTheme } from '../theme/ThemeContext';

const THUMB = 28;

/**
 * A slider that snaps to `steps` (any list of values): drag the thumb or tap the track; each new step
 * gives a light tick. `value` null means not set yet: the thumb waits at `start` in a pale colour until
 * it's touched. Plain JavaScript (PanResponder), so it needs no native module. Screen readers can step
 * it up or down. `label(value)` names a value for them.
 */
export default function StepSlider({ steps, value, start, onChange, color, label = String }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const track = useRef({ x: 0, width: 0 });
  const viewRef = useRef(null);
  const [width, setWidth] = useState(0);
  const last = useRef(value);
  last.current = value;
  // The drag handler is made once; these keep it on the latest steps and callback.
  const latest = useRef({ steps, onChange });
  latest.current = { steps, onChange };

  const set = Math.max(0, steps.indexOf(value));
  const index = value == null ? Math.max(0, steps.indexOf(start ?? steps[0])) : set;
  const max = steps.length - 1;
  const at = (i) => (max ? (i / max) * Math.max(0, width - THUMB) : 0);

  const pickAt = (pageX) => {
    const { steps, onChange } = latest.current; // eslint-disable-line no-shadow
    const max = steps.length - 1; // eslint-disable-line no-shadow
    const usable = Math.max(1, track.current.width - THUMB);
    const ratio = Math.min(1, Math.max(0, (pageX - track.current.x - THUMB / 2) / usable));
    const next = steps[Math.round(ratio * max)];
    if (next !== last.current) {
      Haptics.selectionAsync().catch(() => {});
      last.current = next;
      onChange(next);
    }
  };

  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false, // keep the drag (the page doesn't scroll away with it)
      onPanResponderGrant: (e) => {
        // Where the track is on screen right now (the page may have scrolled).
        viewRef.current?.measureInWindow((x, y, w) => {
          track.current = { x, width: w };
          pickAt(e.nativeEvent.pageX);
        });
      },
      onPanResponderMove: (e) => pickAt(e.nativeEvent.pageX),
    })
  ).current;

  const fill = value == null ? 0 : at(index) + THUMB / 2;
  return (
    <View
      ref={viewRef}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={styles.hit}
      accessible
      accessibilityRole="adjustable"
      accessibilityValue={{ text: value == null ? 'Not set' : label(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const i = value == null ? index : set;
        const next = steps[Math.min(max, Math.max(0, i + (e.nativeEvent.actionName === 'increment' ? 1 : -1)))];
        onChange(next);
      }}
      {...pan.panHandlers}
    >
      <View style={styles.track}>
        <View style={[styles.fill, { width: fill, backgroundColor: color }]} />
      </View>
      <View
        pointerEvents="none"
        style={[styles.thumb, { left: at(index), borderColor: value == null ? colors.borderStrong : color }, value == null && styles.thumbIdle]}
      />
    </View>
  );
}

const makeStyles = (colors) => ({
  // The touch area is taller than the track (easy to grab).
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: colors.border },
  fill: { height: 6, borderRadius: 3 },
  thumb: {
    position: 'absolute',
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: 3,
    backgroundColor: colors.surface,
    shadowColor: '#0A1716',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  thumbIdle: { shadowOpacity: 0.08, elevation: 1 },
});
