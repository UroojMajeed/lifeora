import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Button from './Button';
import Chip from './Chip';
import { HOUR_OPTIONS, hoursLabel, suggestionsFor, usualHours } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const WINDOW_HEIGHT = Dimensions.get('window').height;
const sameName = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();

/** Height of the on-screen keyboard, so the sheet can sit right above it. */
function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener(hideEvent, () => setHeight(0));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return height;
}

/**
 * Bottom sheet for the user's day.
 * Add mode: pick an activity (type one or tap a suggestion) → pick hours → it's added and the sheet closes.
 * Edit mode (`editing` set): rename the activity and change its hours.
 */
export default function AddActivitySheet({ visible, role, items, editing, onAdd, onSave, onClose }) {
  const { colors, isDark } = useTheme();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  const [step, setStep] = useState('pick');
  const [name, setName] = useState('');
  const [draft, setDraft] = useState('');
  const slide = useRef(new Animated.Value(0)).current;

  // Names already in the day, except the one being edited.
  const taken = (n) => items.some((i) => i !== editing && sameName(i.activity, n));
  const suggestions = suggestionsFor(role).filter((n) => !taken(n));

  useEffect(() => {
    if (!visible) return;
    setDraft('');
    if (editing) {
      setName(editing.activity);
      setStep('hours');
    } else {
      setName('');
      setStep('pick');
    }
  }, [visible, editing]);

  // Slide the new step in from the side.
  useEffect(() => {
    slide.setValue(step === 'hours' ? 40 : -40);
    Animated.timing(slide, { toValue: 0, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [step, slide]);

  const choose = (n) => {
    const clean = n.trim().slice(0, 60);
    if (!clean || taken(clean)) return;
    Keyboard.dismiss();
    Haptics.selectionAsync().catch(() => {});
    setName(clean);
    setDraft('');
    setStep('hours');
  };

  const pickHours = (h) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (editing) onSave({ ...editing, activity: name.trim() || editing.activity, hours: h });
    else onAdd(name, h);
    onClose();
  };

  const nameInvalid = !name.trim() || taken(name);
  const usual = usualHours(name.trim());
  const draftInvalid = !draft.trim() || taken(draft);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.anchor} pointerEvents="box-none">
        <View
          style={[
            styles.sheet,
            {
              maxHeight: WINDOW_HEIGHT - keyboard - insets.top - spacing.lg,
              marginBottom: keyboard,
              paddingBottom: (keyboard ? 0 : insets.bottom) + spacing.md,
            },
          ]}
        >
          <View style={styles.handle} />

          <Animated.View style={[styles.body, { transform: [{ translateX: slide }] }]}>
            {step === 'pick' ? (
              <>
                <Text style={styles.title}>{items.length ? 'Add an activity' : "What's the first thing you do in a day?"}</Text>
                <Text style={styles.subtitle}>Type your own or tap a suggestion, then pick how long it takes.</Text>

                <View style={styles.inputRow}>
                  <TextInput
                    value={draft}
                    onChangeText={setDraft}
                    placeholder="Type your own…"
                    placeholderTextColor={colors.muted}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                    returnKeyType="next"
                    onSubmitEditing={() => choose(draft)}
                    maxLength={60}
                    style={styles.input}
                  />
                  <Pressable
                    onPress={() => choose(draft)}
                    disabled={draftInvalid}
                    accessibilityRole="button"
                    accessibilityLabel="Next"
                    style={[styles.next, draftInvalid && { opacity: 0.35 }]}
                  >
                    <Ionicons name="arrow-forward" size={20} color={colors.onColor} />
                  </Pressable>
                </View>
                {draft.trim() && taken(draft) ? <Text style={styles.warn}>That's already in your day.</Text> : null}

                {suggestions.length ? (
                  <>
                    <Text style={styles.sectionLabel}>Suggestions</Text>
                    <ScrollView style={styles.chipScroll} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
                      {suggestions.map((n) => (
                        <Chip key={n} label={n} icon="add" selected={false} onPress={() => choose(n)} />
                      ))}
                    </ScrollView>
                  </>
                ) : null}
              </>
            ) : (
              <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {!editing ? (
                  <Pressable onPress={() => setStep('pick')} hitSlop={10} accessibilityRole="button" style={styles.back}>
                    <Ionicons name="chevron-back" size={18} color={colors.primaryDark} />
                    <Text style={styles.backText}>Back</Text>
                  </Pressable>
                ) : null}

                {editing ? (
                  <>
                    <Text style={styles.title}>Edit activity</Text>
                    <Text style={styles.fieldLabel}>Name</Text>
                    <View style={styles.inputRow}>
                      <TextInput
                        value={name}
                        onChangeText={setName}
                        keyboardAppearance={isDark ? 'dark' : 'light'}
                        returnKeyType="done"
                        maxLength={60}
                        style={styles.input}
                        accessibilityLabel="Activity name"
                      />
                    </View>
                    {name.trim() && taken(name) ? <Text style={styles.warn}>That's already in your day.</Text> : null}
                    <Text style={styles.fieldLabel}>How long a day?</Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.title}>How long does {name} take a day?</Text>
                    <Text style={styles.subtitle}>{usual ? 'The highlighted one is usual for most people.' : 'A rough guess is fine.'}</Text>
                  </>
                )}

                <View style={styles.hoursGrid}>
                  {HOUR_OPTIONS.map((h) => {
                    const isUsual = usual === h;
                    const isCurrent = editing?.hours === h;
                    return (
                      <Pressable
                        key={h}
                        onPress={() => pickHours(h)}
                        disabled={nameInvalid}
                        accessibilityRole="button"
                        accessibilityLabel={`${hoursLabel(h)}${isUsual ? ', usual' : ''}`}
                        style={({ pressed }) => [
                          styles.hourBtn,
                          isUsual && styles.hourUsual,
                          isCurrent && styles.hourCurrent,
                          nameInvalid && { opacity: 0.4 },
                          pressed && styles.hourPressed,
                        ]}
                      >
                        <Text style={[styles.hourText, isCurrent && styles.hourTextOn]}>{hoursLabel(h)}</Text>
                        {isUsual ? <Text style={[styles.usualTag, isCurrent && styles.hourTextOn]}>Usual</Text> : null}
                      </Pressable>
                    );
                  })}
                </View>

                {editing ? (
                  <Button
                    title="Save"
                    icon="checkmark"
                    onPress={() => pickHours(editing.hours)}
                    disabled={nameInvalid}
                    style={styles.save}
                  />
                ) : null}
              </ScrollView>
            )}
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (colors) => ({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,23,0.55)' },
  anchor: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    overflow: 'hidden',
  },
  body: { flexShrink: 1 },
  handle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.md },
  title: { fontSize: 22, fontWeight: '800', color: colors.text, letterSpacing: -0.4 },
  subtitle: { fontSize: 14, color: colors.muted, marginTop: 4, marginBottom: spacing.md },
  fieldLabel: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: spacing.md, marginBottom: spacing.sm },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: spacing.md, marginBottom: spacing.sm },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: 6,
    minHeight: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },
  input: { flex: 1, fontSize: 16, color: colors.text, paddingVertical: 12 },
  warn: { fontSize: 13, color: colors.error, marginTop: 6 },
  next: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.accent },
  chipScroll: { flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.sm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start', marginBottom: spacing.sm },
  backText: { fontSize: 15, fontWeight: '600', color: colors.primaryDark },
  hoursGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingBottom: spacing.sm },
  hourBtn: {
    width: '31.5%',
    height: 64,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  hourUsual: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  hourCurrent: { backgroundColor: colors.primary, borderColor: colors.primary },
  hourPressed: { transform: [{ scale: 0.96 }], opacity: 0.85 },
  hourText: { fontSize: 16, fontWeight: '800', color: colors.text },
  hourTextOn: { color: colors.onColor },
  usualTag: { fontSize: 11, fontWeight: '700', color: colors.primaryDark, marginTop: 2 },
  save: { marginTop: spacing.sm },
});
