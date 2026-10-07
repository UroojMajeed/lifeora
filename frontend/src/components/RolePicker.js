import { useRef, useState } from 'react';
import { Keyboard, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ROLES } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

// A colour and a one-line description for each role, so the list reads at a glance.
const ROLE_LOOK = {
  agency: { light: ['#2F6A8A', '#DCECF4'], dark: ['#7FB8DA', 'rgba(127,184,218,0.16)'], line: 'You run a team that delivers for clients' },
  coach: { light: ['#1E7770', '#D7F1E8'], dark: ['#5FD3B8', 'rgba(95,211,184,0.16)'], line: 'You sell your know-how, 1:1 or in groups' },
  ecommerce: { light: ['#A8601A', '#FCEBD3'], dark: ['#F5B971', 'rgba(245,185,113,0.16)'], line: 'You sell products online' },
  saas: { light: ['#4F4FC4', '#E6E6FB'], dark: ['#A5A5F5', 'rgba(165,165,245,0.16)'], line: 'You build and sell software' },
  freelancer: { light: ['#7A4FB5', '#EFE6FA'], dark: ['#C4A5EE', 'rgba(196,165,238,0.16)'], line: 'You do client work on your own' },
  other: { light: ['#B3463D', '#F7E2DF'], dark: ['#EF8C82', 'rgba(239,140,130,0.16)'], line: 'Your business is something different' },
};

function RoleIcon({ role, size = 36 }) {
  const { isDark } = useTheme();
  const look = ROLE_LOOK[role.key];
  const [fg, bg] = isDark ? look.dark : look.light;
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: bg }}>
      <Ionicons name={role.icon.replace('-outline', '')} size={size * 0.5} color={fg} />
    </View>
  );
}

/**
 * "What describes you?" as a dropdown (like the currency picker): the field shows the chosen role
 * with its colour icon; the list floats over the screen and a tap outside closes it.
 */
export default function RolePicker({ value, onChange }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const boxRef = useRef(null);
  const { height: screenHeight } = useWindowDimensions();
  const current = ROLES.find((r) => r.key === value);

  const toggle = () => {
    Haptics.selectionAsync().catch(() => {});
    if (open) {
      setOpen(false);
      return;
    }
    Keyboard.dismiss();
    boxRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setOpen(true);
    });
  };

  const pick = (key) => {
    Haptics.selectionAsync().catch(() => {});
    onChange(key);
    setOpen(false);
  };

  const top = anchor ? anchor.y + anchor.height + 6 : 0;
  const listHeight = Math.max(200, Math.min(420, screenHeight - top - 40));

  return (
    <View>
      <Pressable
        ref={boxRef}
        collapsable={false}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={`What describes you: ${current?.label || 'not chosen'}. Tap to choose.`}
        accessibilityState={{ expanded: open }}
        style={({ pressed }) => [styles.box, open && styles.boxOpen, pressed && { opacity: 0.85 }]}
      >
        {current ? (
          <>
            <RoleIcon role={current} />
            <View style={{ flex: 1 }}>
              <Text style={styles.value}>{current.label}</Text>
              <Text style={styles.line} numberOfLines={1}>
                {ROLE_LOOK[current.key].line}
              </Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.placeholderIcon}>
              <Ionicons name="person-outline" size={18} color={colors.muted} />
            </View>
            <Text style={[styles.placeholder, { flex: 1 }]}>Choose what describes you</Text>
          </>
        )}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>

      <Modal visible={open && Boolean(anchor)} transparent animationType="fade" onRequestClose={() => setOpen(false)} statusBarTranslucent>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setOpen(false)} accessibilityLabel="Close" />
        {anchor ? (
          <View style={[styles.dropdown, { top, left: anchor.x, width: anchor.width }]}>
            <ScrollView style={{ maxHeight: listHeight }}>
              {ROLES.map((r) => {
                const on = r.key === value;
                return (
                  <Pressable
                    key={r.key}
                    onPress={() => pick(r.key)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    style={({ pressed }) => [styles.row, on && styles.rowOn, pressed && { opacity: 0.7 }]}
                  >
                    <RoleIcon role={r} size={40} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowLabel}>{r.label}</Text>
                      <Text style={styles.line} numberOfLines={1}>
                        {ROLE_LOOK[r.key].line}
                      </Text>
                    </View>
                    {on ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const makeStyles = (colors) => ({
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm + 2,
    minHeight: 64,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  boxOpen: { borderColor: colors.primary },
  value: { fontSize: 16, fontWeight: '800', color: colors.text },
  line: { fontSize: 12, color: colors.muted, marginTop: 1 },
  placeholderIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.border,
  },
  placeholder: { fontSize: 16, color: colors.muted },
  dropdown: {
    position: 'absolute',
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2, paddingVertical: 10, paddingHorizontal: spacing.md },
  rowOn: { backgroundColor: colors.primarySoft },
  rowLabel: { fontSize: 15, fontWeight: '700', color: colors.text },
});
