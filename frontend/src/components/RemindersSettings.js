import { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, Switch, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from './Card';
import BottomSheet from './BottomSheet';
import Button from './Button';
import { useOnboarding } from '../context/OnboardingContext';
import { askForReminders, openPhoneSettings, reminderPermission, sendTestReminder } from '../notifications';
import { TEST_MODE } from '../constants/testing';
import { CHECK_IN_DAYS, CHECK_IN_HOURS, DEFAULT_REMINDERS } from '../notifications/plan';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const hourLabel = (hour) => `${hour % 12 || 12} ${hour < 12 ? 'am' : 'pm'}`;

/**
 * Me → Notifications: each kind of reminder on or off, and when the weekly check-in reminder comes.
 * Settings live on the account; the phone's own permission decides whether any can show.
 */
export default function RemindersSettings() {
  const styles = useStyles(makeStyles);
  const { user, updateReminders } = useOnboarding();
  const [prefs, setPrefs] = useState({ ...DEFAULT_REMINDERS, ...user?.reminders });
  const [permission, setPermission] = useState({ status: 'unavailable', canAsk: false });
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ day: prefs.checkInDay, hour: prefs.checkInHour });

  useEffect(() => setPrefs({ ...DEFAULT_REMINDERS, ...user?.reminders }), [user?.reminders]);
  // Back from the phone's settings: the permission may have changed.
  useFocusEffect(
    useCallback(() => {
      reminderPermission().then(setPermission);
    }, [])
  );

  const change = async (patch) => {
    const before = prefs;
    setPrefs({ ...prefs, ...patch });
    try {
      await updateReminders(patch);
    } catch (err) {
      setPrefs(before);
      Alert.alert("Couldn't save that", err.message);
    }
  };
  const turnOn = async () => {
    await askForReminders();
    setPermission(await reminderPermission());
  };
  // Testing only: a sample reminder in 10 seconds, to see how it looks and where a tap goes.
  const [testSent, setTestSent] = useState(false);
  const testNow = async () => {
    if (await sendTestReminder().catch(() => false)) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 12000);
    }
  };
  const saveTime = () => {
    setEditing(false);
    change({ checkInDay: draft.day, checkInHour: draft.hour });
  };

  const { status, canAsk } = permission;
  return (
    <Card style={styles.card}>
      {status === 'unavailable' ? (
        <Text style={styles.note}>Reminders come with the next app update.</Text>
      ) : status !== 'granted' ? (
        <View>
          <Text style={styles.note}>
            {canAsk ? 'A reminder on check-in day and on start days. Never at night, never daily.' : 'Notifications are off for Lifeora in your phone settings.'}
          </Text>
          <Button
            title={canAsk ? 'Turn on reminders' : 'Open phone settings'}
            icon={canAsk ? 'notifications' : 'settings-outline'}
            size="small"
            variant="secondary"
            onPress={canAsk ? turnOn : openPhoneSettings}
            style={styles.turnOn}
          />
        </View>
      ) : (
        <>
          <Toggle
            icon="pulse"
            title="Weekly check-in"
            value={prefs.checkIn ? `${DAY_NAMES[prefs.checkInDay]} · ${hourLabel(prefs.checkInHour)}` : 'Off'}
            on={prefs.checkIn}
            onToggle={(v) => change({ checkIn: v })}
            onPress={
              prefs.checkIn
                ? () => {
                    setDraft({ day: prefs.checkInDay, hour: prefs.checkInHour });
                    setEditing(true);
                  }
                : undefined
            }
          />
          <View style={styles.divider} />
          <Toggle icon="calendar-outline" title="Start days" value="The morning a handover begins" on={prefs.startDay} onToggle={(v) => change({ startDay: v })} />
          <View style={styles.divider} />
          <Toggle icon="hourglass-outline" title="Stuck handoffs" value="A nudge after 3 quiet days, at most weekly" on={prefs.nudges} onToggle={(v) => change({ nudges: v })} />
          {TEST_MODE ? (
            <Pressable onPress={testNow} accessibilityRole="button" style={styles.test}>
              <Text style={styles.testText}>{testSent ? 'Sent: switch away from the app to see it' : 'Send a test reminder in 10 seconds'}</Text>
            </Pressable>
          ) : null}
        </>
      )}

      <BottomSheet visible={editing} onClose={() => setEditing(false)}>
        <Text style={styles.sheetTitle}>Check-in reminder</Text>
        <Text style={styles.sheetLabel}>Day</Text>
        <View style={styles.chips}>
          {CHECK_IN_DAYS.map((d) => (
            <Chip key={d} label={DAY_NAMES[d]} on={draft.day === d} onPress={() => setDraft({ ...draft, day: d })} />
          ))}
        </View>
        <Text style={styles.sheetLabel}>Time</Text>
        <View style={styles.chips}>
          {CHECK_IN_HOURS.map((hr) => (
            <Chip key={hr} label={hourLabel(hr)} on={draft.hour === hr} onPress={() => setDraft({ ...draft, hour: hr })} />
          ))}
        </View>
        <Button title="Save" icon="checkmark" onPress={saveTime} style={styles.save} />
      </BottomSheet>
    </Card>
  );
}

function Toggle({ icon, title, value, on, onToggle, onPress }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <View style={styles.row}>
      <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined} style={styles.rowMain}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={colors.primaryDark} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          <Text style={[styles.rowValue, onPress && styles.rowValueLink]}>{value}</Text>
        </View>
      </Pressable>
      <Switch
        value={on}
        onValueChange={onToggle}
        accessibilityLabel={title}
        trackColor={{ false: colors.border, true: colors.primary }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

function Chip({ label, on, onPress }) {
  const styles = useStyles(makeStyles);
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityState={{ selected: on }} style={[styles.chip, on && styles.chipOn]}>
      <Text style={[styles.chipText, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

const makeStyles = (colors) => ({
  card: { paddingVertical: spacing.sm },
  note: { fontSize: 14, lineHeight: 20, color: colors.muted, paddingVertical: spacing.sm },
  turnOn: { alignSelf: 'flex-start', marginBottom: spacing.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rowMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  rowIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceAlt },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowValue: { fontSize: 13, color: colors.muted, marginTop: 1 },
  rowValueLink: { color: colors.primary, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.border },
  test: { alignSelf: 'center', paddingVertical: spacing.sm, marginTop: 2 },
  testText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  sheetLabel: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: spacing.md, marginBottom: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border },
  chipOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
  chipTextOn: { color: colors.onColor },
  save: { marginTop: spacing.lg },
});
