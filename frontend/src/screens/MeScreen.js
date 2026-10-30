import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import BottomSheet from '../components/BottomSheet';
import TextField from '../components/TextField';
import RemindersSettings from '../components/RemindersSettings';
import Button from '../components/Button';
import MilestoneBadges from '../components/MilestoneBadges';
import { loadMilestones } from '../storage/milestones';
import { boughtBackTotalHours } from '../storage/progress';
import { milestoneList, nextMilestone, roundMilestone } from '../constants/milestones';
import { useOnboarding } from '../context/OnboardingContext';
import { formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { radius, spacing } from '../theme';

function Row({ icon, title, value, onPress, disabled, badge, danger, busy }) {
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={`${title}${value ? `: ${value}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={[styles.rowIcon, danger && styles.rowIconDanger]}>
        <Ionicons name={icon} size={18} color={danger ? colors.error : colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, disabled && { color: colors.muted }, danger && { color: colors.error }]}>{title}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      {busy ? <ActivityIndicator size="small" color={colors.muted} /> : null}
      {onPress && !disabled && !busy ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

/** Settings and profile: your account, Buyback Rate, milestones, notifications, about. */
export default function MeScreen({ navigation }) {
  const { user, onboarding, startOver, signOut, updateName } = useOnboarding();
  // Changing your name (tap the account card).
  const [naming, setNaming] = useState(false);
  const [newName, setNewName] = useState('');
  const [savingName, setSavingName] = useState(false);
  const openName = () => {
    setNewName(user?.name || '');
    setNaming(true);
  };
  const saveName = async () => {
    if (!newName.trim()) return;
    setSavingName(true);
    try {
      await updateName(newName.trim());
      setNaming(false);
    } catch (err) {
      Alert.alert("Couldn't save your name", err.message);
    } finally {
      setSavingName(false);
    }
  };
  const saved = user && !user.isGuest;
  const { type, colors } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [miles, setMiles] = useState({ earned: [], next: null }); // milestones reached, and the next one

  useFocusEffect(
    useCallback(() => {
      // Milestones reached (kept with your account) and the next one, from the hours bought back so far.
      Promise.all([loadMilestones(), boughtBackTotalHours()]).then(([map, hours]) => {
        const all = [...milestoneList(), ...Object.keys(map).filter((k) => k.startsWith('round-')).map((k) => roundMilestone(Number(k.split('-')[1])))];
        setMiles({ earned: all.filter((m) => map[m.key]), next: nextMilestone({ hours }) });
      });
    }, [])
  );

  const deleteEverything = async () => {
    setDeleting(true);
    try {
      await startOver();
      navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
    } catch (err) {
      setDeleting(false);
      Alert.alert("Couldn't delete your data", err.message);
    }
  };

  const confirmSignOut = () =>
    Alert.alert(
      'Sign out?',
      'Your progress stays safe in your account. Sign in again any time with your email.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign out',
          onPress: async () => {
            await signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
          },
        },
      ],
      { cancelable: true }
    );

  const confirmStartOver = () =>
    Alert.alert(
      saved ? 'Delete your account?' : 'Delete everything and start over?',
      `Your ${saved ? 'account, ' : ''}Buyback Rate, your routine and your handoffs will be deleted for good.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteEverything },
      ],
      { cancelable: true }
    );
  const styles = useStyles(makeStyles);
  const currency = onboarding?.currency || 'USD';
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <Screen edges={['top']}>
      <PageHeader eyebrow="Me" title="Your settings" />

      {saved ? (
        <Pressable onPress={openName} accessibilityRole="button" accessibilityHint="Change your name" style={({ pressed }) => [styles.account, pressed && { opacity: 0.85 }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(user.name || user.email || '?').trim()[0].toUpperCase()}</Text>
          </View>
          <View style={styles.accountMain}>
            <Text style={styles.accountName} numberOfLines={1}>
              {user.name || 'Your account'}
            </Text>
            <Text style={styles.accountEmail} numberOfLines={1}>
              {user.email}
            </Text>
            <View style={styles.synced}>
              <Ionicons name="checkmark-circle" size={13} color={colors.success} />
              <Text style={styles.syncedText}>Saved · on any phone</Text>
            </View>
          </View>
          <Ionicons name="create-outline" size={18} color={colors.muted} />
        </Pressable>
      ) : null}

      <BottomSheet visible={naming} onClose={() => setNaming(false)}>
        <Text style={styles.sheetTitle}>Your name</Text>
        <TextField
          label="What should we call you?"
          value={newName}
          onChangeText={setNewName}
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={saveName}
          maxLength={80}
        />
        <Button title="Save" icon="checkmark" onPress={saveName} loading={savingName} disabled={!newName.trim()} style={styles.sheetButton} />
      </BottomSheet>

      <Text style={[type.label, styles.section]}>Your numbers</Text>
      <Card style={styles.card}>
        <Row
          icon="cash-outline"
          title="Buyback Rate"
          value={`${formatMoney(onboarding?.buybackRate, currency)}/hr · from ${formatMoney(onboarding?.annualIncome, currency, { decimals: 0 })} a year`}
          onPress={() => navigation.navigate('BuybackRate', { editing: true })}
        />
      </Card>

      {miles.earned.length || miles.next ? (
        <>
          <Text style={[type.label, styles.section]}>Milestones</Text>
          <Card style={styles.card}>
            <MilestoneBadges earned={miles.earned} next={miles.next} />
          </Card>
        </>
      ) : null}

      <Text style={[type.label, styles.section]}>Notifications</Text>
      <RemindersSettings />

      <Text style={[type.label, styles.section]}>Account</Text>
      <Card style={styles.card}>
        {saved ? (
          <>
            <Row icon="log-out-outline" title="Sign out" onPress={confirmSignOut} />
          </>
        ) : (
          <>
            <Row
              icon="cloud-upload-outline"
              title="Save your progress"
              value="Your data is only on this phone. Save it to get it back on any phone."
              onPress={() => navigation.navigate('Account', { mode: 'save' })}
            />
            <View style={styles.divider} />
            <Row
              icon="log-in-outline"
              title="Sign in"
              value="Already saved your progress? Sign in here."
              onPress={() => navigation.navigate('Account', { mode: 'signin' })}
            />
          </>
        )}
        <View style={styles.divider} />
        <Row
          icon="trash-outline"
          title={saved ? 'Delete my account' : 'Delete my data and start over'}
          value="Removes everything and takes you back to the start."
          onPress={confirmStartOver}
          busy={deleting}
          disabled={deleting}
          danger
        />
      </Card>


      <Text style={[type.label, styles.section]}>About</Text>
      <Card style={styles.card}>
        <Row icon="book-outline" title="Built on Buy Back Your Time" value="The book by Dan Martell" />
        <View style={styles.divider} />
        <Row icon="information-circle-outline" title="Lifeora" value={`Version ${version}`} />
      </Card>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  sheetTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: spacing.md },
  sheetButton: { marginTop: spacing.md },
  account: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, padding: spacing.md, marginBottom: spacing.sm, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary },
  avatarText: { fontSize: 22, fontWeight: '800', color: colors.onColor },
  accountMain: { flex: 1, gap: 2 },
  accountName: { fontSize: 18, fontWeight: '800', color: colors.text },
  accountEmail: { fontSize: 14, color: colors.muted },
  synced: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  syncedText: { fontSize: 12, fontWeight: '700', color: colors.success },
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  card: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md - 2 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  rowIconDanger: { backgroundColor: colors.errorSoft },
  rowTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  rowValue: { fontSize: 13, lineHeight: 18, color: colors.muted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.border, marginLeft: 52 },
  badge: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentText,
    backgroundColor: colors.accentSoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
});
