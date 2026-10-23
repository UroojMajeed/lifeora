import { useLayoutEffect, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Button from "./Button";
import {
  MAX_PLAN_STEPS,
  STEP_INFO,
  STEP_PICKS,
  defaultSteps,
  isFinish,
  newStepId,
} from "../constants/journey";
import { useStyles, useTheme } from "../theme/ThemeContext";
import { radius, spacing } from "../theme";

const GAP = spacing.sm;

/**
 * Making a handoff plan yours: rename a step (tap its name), drag it by its handle to a new place,
 * delete it, or add your own (typed, or a quick pick). The last step finishes the handoff, so it stays
 * last and can't be deleted (you can still rename it). Ticked steps stay ticked. `onSave(steps)`
 * confirms the plan; `onCancel` (when editing a confirmed plan) leaves it as it was. `onDragging(on)`
 * lets the screen stop scrolling while a step is dragged; `onAddFocus` lets it bring the new step's
 * field above the keyboard.
 */
export default function PlanEditor({
  initial,
  method,
  editing,
  saving,
  onSave,
  onCancel,
  onDragging,
  onAddFocus,
}) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [steps, setSteps] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [dragId, setDragId] = useState(null);
  const last = steps.length - 1;
  const tick = () => Haptics.selectionAsync().catch(() => {});
  const change = (next) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSteps(next);
  };

  // Dragging: the dragged row follows the finger; the rows it passes slide out of its way; the new
  // order is kept when it's dropped. The finishing step stays where it is (last).
  const rowSpan = useRef(64); // one row's height plus the gap, measured
  const shifts = useRef({});
  const shiftOf = (id) =>
    shifts.current[id] || (shifts.current[id] = new Animated.Value(0));
  const drag = useRef(null);
  const maxSlot = isFinish(steps[last]) ? last - 1 : last;

  const dragStart = (i) => {
    drag.current = { from: i, to: i };
    setDragId(steps[i].id);
    onDragging?.(true);
    tick();
  };
  const dragMove = (dy) => {
    if (!drag.current) return;
    const { from } = drag.current;
    const span = rowSpan.current;
    const y = Math.max(-from * span, Math.min((maxSlot - from) * span, dy));
    shiftOf(steps[from].id).setValue(y);
    const to = Math.max(0, Math.min(maxSlot, from + Math.round(y / span)));
    if (to === drag.current.to) return;
    drag.current.to = to;
    tick();
    steps.forEach((s, i) => {
      if (i === from || i > maxSlot) return;
      const v = from < i && i <= to ? -span : to <= i && i < from ? span : 0;
      Animated.timing(shiftOf(s.id), {
        toValue: v,
        duration: 140,
        useNativeDriver: true,
      }).start();
    });
  };
  const dragEnd = () => {
    if (!drag.current) return;
    const { from, to } = drag.current;
    drag.current = null;
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSteps(next);
    setDragId(null);
    onDragging?.(false);
    setDrops((n) => n + 1);
  };
  // Once the new order is on screen, the rows drop their drag offsets (so nothing jumps).
  const [drops, setDrops] = useState(0);
  useLayoutEffect(() => {
    Object.values(shifts.current).forEach((v) => v.setValue(0));
  }, [drops]);
  // Always the latest handlers (each row's drag responder is made once).
  const handlers = useRef({});
  handlers.current = { dragStart, dragMove, dragEnd };

  const rename = (id, title) =>
    setSteps((list) => list.map((s) => (s.id === id ? { ...s, title } : s)));
  const move = (i, d) => {
    const j = i + d;
    if (j < 0 || j > maxSlot) return;
    tick();
    const next = [...steps];
    [next[i], next[j]] = [next[j], next[i]];
    change(next);
  };
  const remove = (i) => {
    tick();
    change(steps.filter((_, j) => j !== i));
  };
  // A new step goes just before the finishing one.
  const add = (title) => {
    const t = title.trim().slice(0, 40);
    if (!t || steps.length >= MAX_PLAN_STEPS) return;
    tick();
    change([
      ...steps.slice(0, last),
      { id: newStepId(), kind: "custom", title: t, done: false },
      steps[last],
    ]);
    setName("");
    setAdding(false);
  };
  // The suggested steps again, keeping the ticks of any you've already done.
  const reset = () => {
    const ticked = new Set(steps.filter((s) => s.done).map((s) => s.kind));
    change(
      defaultSteps(method).map((s) => ({ ...s, done: ticked.has(s.kind) })),
    );
  };
  const confirm = () =>
    onSave(
      steps.map((s) => ({
        ...s,
        title: s.title.trim() || STEP_INFO[s.kind]?.title || "My step",
      })),
    );

  const picks = STEP_PICKS.filter(
    (p) => !steps.some((s) => s.title.toLowerCase() === p.toLowerCase()),
  );
  const full = steps.length >= MAX_PLAN_STEPS;

  return (
    <View>
      <Text style={styles.title}>
        {editing ? "Edit your plan" : "Your plan"}
      </Text>
      <Text style={styles.sub}>
        {editing
          ? "Change the steps, then save."
          : "Make the steps yours, then confirm."}
      </Text>

      <View style={styles.list}>
        {steps.map((s, i) => {
          const fixed = i > maxSlot;
          const lifted = dragId === s.id;
          return (
            <Animated.View
              key={s.id}
              onLayout={
                i === 0
                  ? (e) => (rowSpan.current = e.nativeEvent.layout.height + GAP)
                  : undefined
              }
              style={[
                styles.row,
                lifted && styles.rowLifted,
                { transform: [{ translateY: shiftOf(s.id) }] },
              ]}
            >
              <View style={[styles.num, s.done && styles.numDone]}>
                {s.done ? (
                  <Ionicons name="checkmark" size={14} color={colors.onColor} />
                ) : (
                  <Text style={styles.numText}>{i + 1}</Text>
                )}
              </View>
              <View style={styles.main}>
                <TextInput
                  value={s.title}
                  onChangeText={(t) => rename(s.id, t)}
                  maxLength={40}
                  style={styles.name}
                  accessibilityLabel={`Step ${i + 1} name`}
                  returnKeyType="done"
                />
                <Text
                  style={[styles.tag, s.kind === "custom" && styles.tagYours]}
                >
                  {s.done
                    ? "Done"
                    : s.kind === "custom"
                      ? "Your step"
                      : "Suggested"}
                </Text>
              </View>
              {fixed ? (
                <View style={styles.lock}>
                  <Ionicons name="lock-closed" size={11} color={colors.muted} />
                  <Text style={styles.lockText}>Finishes it</Text>
                </View>
              ) : (
                <>
                  <Pressable
                    onPress={() => remove(i)}
                    hitSlop={4}
                    accessibilityRole="button"
                    accessibilityLabel="Delete step"
                    style={styles.icon}
                  >
                    <Ionicons name="close" size={17} color={colors.muted} />
                  </Pressable>
                  <DragHandle
                    index={i}
                    handlers={handlers}
                    onStep={(d) => move(i, d)}
                    color={lifted ? colors.primary : colors.muted}
                    style={styles.handle}
                  />
                </>
              )}
            </Animated.View>
          );
        })}

        {adding ? (
          <View style={styles.add}>
            <Text style={styles.addTitle}>New step</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              onSubmitEditing={() => add(name)}
              onFocus={onAddFocus}
              placeholder="Name your step"
              placeholderTextColor={colors.muted}
              maxLength={40}
              autoFocus
              returnKeyType="done"
              style={styles.addInput}
            />
            {picks.length ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.chips}
              >
                {picks.map((p) => (
                  <Pressable
                    key={p}
                    onPress={() => add(p)}
                    style={styles.chip}
                    accessibilityRole="button"
                    accessibilityLabel={`Add ${p}`}
                  >
                    <Ionicons name="add" size={14} color={colors.muted} />
                    <Text style={styles.chipText}>{p}</Text>
                  </Pressable>
                ))}
              </ScrollView>
            ) : null}
            <View style={styles.addActions}>
              <Pressable
                onPress={() => {
                  setName("");
                  setAdding(false);
                }}
                hitSlop={8}
                accessibilityRole="button"
                style={styles.addCancel}
              >
                <Text style={styles.addCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => add(name)}
                disabled={!name.trim()}
                style={[styles.addBtn, !name.trim() && styles.off]}
                accessibilityRole="button"
              >
                <Ionicons name="add" size={16} color={colors.onColor} />
                <Text style={styles.addBtnText}>Add step</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <Pressable
            onPress={() => setAdding(true)}
            disabled={full}
            style={[styles.addRow, full && styles.off]}
            accessibilityRole="button"
          >
            <Ionicons name="add" size={18} color={colors.primary} />
            <Text style={styles.addRowText}>
              {full ? `Up to ${MAX_PLAN_STEPS} steps` : "Add a step"}
            </Text>
          </Pressable>
        )}
      </View>

      {adding ? null : (
        <>
          <View style={styles.foot}>
            <Text style={styles.count}>
              {steps.length} steps · drag ≡ to reorder
            </Text>
            <Pressable onPress={reset} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>Reset to suggested</Text>
            </Pressable>
          </View>

          <Button
            title={editing ? "Save my plan" : "Confirm my plan"}
            icon="arrow-forward"
            loading={saving}
            onPress={confirm}
            style={styles.confirm}
          />
          {onCancel ? (
            <Pressable
              onPress={onCancel}
              hitSlop={8}
              style={styles.cancel}
              accessibilityRole="button"
            >
              <Text style={styles.link}>Cancel</Text>
            </Pressable>
          ) : null}
        </>
      )}
    </View>
  );
}

/** The ≡ handle a row is dragged by. Screen readers move the step up or down with it instead. */
function DragHandle({ index, handlers, onStep, color, style }) {
  const at = useRef(index);
  at.current = index;
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderTerminationRequest: () => false,
      onShouldBlockNativeResponder: () => true,
      onPanResponderGrant: () => handlers.current.dragStart(at.current),
      onPanResponderMove: (_, g) => handlers.current.dragMove(g.dy),
      onPanResponderRelease: () => handlers.current.dragEnd(),
      onPanResponderTerminate: () => handlers.current.dragEnd(),
    }),
  ).current;
  return (
    <View
      {...pan.panHandlers}
      style={style}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel="Reorder step"
      accessibilityActions={[
        { name: "decrement", label: "Move up" },
        { name: "increment", label: "Move down" },
      ]}
      onAccessibilityAction={(e) =>
        onStep(e.nativeEvent.actionName === "increment" ? 1 : -1)
      }
    >
      <Ionicons name="reorder-three" size={24} color={color} />
    </View>
  );
}

const makeStyles = (colors, isDark) => ({
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.text,
    marginTop: spacing.lg,
  },
  sub: { fontSize: 14, color: colors.muted, marginTop: 2 },
  list: { gap: GAP, marginTop: spacing.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.sm + 2,
    paddingRight: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  // Picked up: above the others, with a shadow and a teal edge.
  rowLifted: {
    zIndex: 2,
    elevation: 6,
    borderColor: colors.primary,
    shadowColor: "#0A1716",
    shadowOpacity: isDark ? 0.5 : 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  num: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primarySoft,
  },
  numDone: { backgroundColor: colors.primary },
  numText: { fontSize: 12, fontWeight: "800", color: colors.primary },
  main: { flex: 1, minWidth: 0 },
  name: { fontSize: 15, fontWeight: "700", color: colors.text, padding: 0 },
  tag: { fontSize: 11, fontWeight: "700", color: colors.muted, marginTop: 1 },
  tagYours: { color: colors.accentText },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  handle: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  off: { opacity: 0.3 },
  lock: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingRight: spacing.sm,
  },
  lockText: { fontSize: 11, fontWeight: "600", color: colors.muted },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    paddingVertical: spacing.sm,
  },
  addRowText: { fontSize: 15, fontWeight: "800", color: colors.primary },
  add: {
    gap: spacing.sm,
    padding: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: colors.borderStrong,
  },
  addTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  addInput: {
    minHeight: 44,
    paddingHorizontal: spacing.sm + 2,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    fontSize: 15,
    color: colors.text,
  },
  addActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.md,
    marginTop: 2,
  },
  addCancel: { paddingVertical: spacing.xs },
  addCancelText: { fontSize: 14, fontWeight: "800", color: colors.muted },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minHeight: 40,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  addBtnText: { fontSize: 14, fontWeight: "800", color: colors.onColor },
  chips: { gap: 6 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.text },
  foot: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  count: { fontSize: 12, color: colors.muted },
  link: { fontSize: 14, fontWeight: "800", color: colors.primary },
  confirm: { marginTop: spacing.lg },
  cancel: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingVertical: spacing.xs,
  },
});
