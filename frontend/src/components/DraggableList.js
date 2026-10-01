import { useEffect, useMemo, useRef, useState } from 'react';
import { View } from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';
import * as Haptics from 'expo-haptics';

const SETTLE = { duration: 180 };

const positionsFrom = (keys) => Object.fromEntries(keys.map((k, i) => [k, i]));

/**
 * A vertical list whose rows can be reordered by dragging a handle. Runs on the UI thread
 * (Reanimated + Gesture Handler), so the row follows the finger smoothly and the others glide aside.
 * Rows must all be `rowHeight` tall. `renderItem` gets a `Handle` component to wrap the drag handle in.
 */
export default function DraggableList({ items, keyOf, rowHeight, gap = 8, renderItem, onReorder, onDragStart, onDragEnd }) {
  const step = rowHeight + gap;
  const keys = items.map(keyOf);
  const signature = keys.join('\u0001');
  const positions = useSharedValue(positionsFrom(keys));
  const activeKey = useSharedValue(null);
  const [activeId, setActiveId] = useState(null);

  // Latest callbacks for the gesture worklets to call back into React.
  const latest = useRef({});
  latest.current = { items, keyOf, onReorder, onDragStart, onDragEnd };

  // Items added, removed, renamed or reordered from outside: re-sync slot positions.
  useEffect(() => {
    positions.value = positionsFrom(keys);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const js = useMemo(
    () => ({
      begin: () => {
        latest.current.onDragStart?.();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      },
      lift: (id) => setActiveId(id),
      tick: () => Haptics.selectionAsync().catch(() => {}),
      end: () => {
        setActiveId(null);
        latest.current.onDragEnd?.();
      },
      commit: (posMap) => {
        const { items: list, keyOf: keyFn, onReorder: reorder } = latest.current;
        const byKey = Object.fromEntries(list.map((it) => [keyFn(it), it]));
        const order = Object.keys(posMap).sort((a, b) => posMap[a] - posMap[b]);
        if (order.join('\u0001') !== list.map(keyFn).join('\u0001')) reorder(order.map((k) => byKey[k]).filter(Boolean));
      },
    }),
    []
  );

  return (
    <View style={{ height: Math.max(0, items.length * step - gap) }}>
      {items.map((item, index) => {
        const id = keyOf(item);
        return (
          <Row
            key={id}
            id={id}
            index={index}
            count={items.length}
            step={step}
            rowHeight={rowHeight}
            positions={positions}
            activeKey={activeKey}
            js={js}
          >
            {(Handle) => renderItem({ item, index, isActive: activeId === id, Handle })}
          </Row>
        );
      })}
    </View>
  );
}

function Row({ id, index, count, step, rowHeight, positions, activeKey, js, children }) {
  const top = useSharedValue(index * step);
  const startTop = useSharedValue(0);
  const lifted = useSharedValue(0);

  // Glide to a new slot whenever another row's drag (or a list change) moves this one.
  useAnimatedReaction(
    () => positions.value[id],
    (slot, prev) => {
      if (slot === undefined || slot === prev || activeKey.value === id) return;
      top.value = withTiming(slot * step, SETTLE);
    },
    [id, step]
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .minDistance(0)
        .onBegin(() => {
          scheduleOnRN(js.begin);
        })
        .onStart(() => {
          activeKey.value = id;
          startTop.value = top.value;
          lifted.value = withSpring(1, { damping: 18, stiffness: 260 });
          scheduleOnRN(js.lift, id);
        })
        .onUpdate((e) => {
          const maxTop = (count - 1) * step;
          top.value = Math.min(Math.max(startTop.value + e.translationY, -step * 0.4), maxTop + step * 0.4);
          const from = positions.value[id];
          const to = Math.min(Math.max(Math.round(top.value / step), 0), count - 1);
          if (to === from) return;
          // Move this row to `to` and shift everything in between by one slot.
          const next = { ...positions.value };
          Object.keys(next).forEach((k) => {
            const p = next[k];
            if (k === id) return;
            if (from < to && p > from && p <= to) next[k] = p - 1;
            else if (to < from && p >= to && p < from) next[k] = p + 1;
          });
          next[id] = to;
          positions.value = next;
          scheduleOnRN(js.tick);
        })
        .onFinalize(() => {
          if (activeKey.value !== id) {
            scheduleOnRN(js.end);
            return;
          }
          lifted.value = withTiming(0, SETTLE);
          // Settle into the slot, then hand the new order to React.
          top.value = withTiming(positions.value[id] * step, SETTLE, () => {
            activeKey.value = null;
            scheduleOnRN(js.commit, positions.value);
            scheduleOnRN(js.end);
          });
        }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, count, step]
  );

  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    height: rowHeight,
    top: top.value,
    zIndex: activeKey.value === id ? 10 : 0,
    transform: [{ scale: 1 + lifted.value * 0.03 }],
    shadowColor: '#000',
    shadowOpacity: lifted.value * 0.2,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: lifted.value * 10,
  }));

  const Handle = useMemo(
    () =>
      function DragHandle({ children: handle }) {
        return <GestureDetector gesture={gesture}>{handle}</GestureDetector>;
      },
    [gesture]
  );

  return <Animated.View style={style}>{children(Handle)}</Animated.View>;
}
