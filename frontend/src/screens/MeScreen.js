import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ActivityIndicator, Alert, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import { Card } from '../components/Card';
import MotivationCard from '../components/MotivationCard';
import MilestoneBadges from '../components/MilestoneBadges';
import { loadMilestones } from '../storage/milestones';
import { boughtBackTotalHours } from '../storage/progress';
import { milestoneList, nextMilestone, roundMilestone } from '../constants/milestones';
import { loadMotivation } from '../storage/motivation';
import { useOnboarding } from '../context/OnboardingContext';
import { ROLES } from '../constants/content';
import { formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

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

/** Settings and profile: Buyback Rate, business type, account, about. (Light/dark is the header toggle.) */
export default function MeScreen({ navigation }) {
  const { user, onboarding, startOver, signOut } = useOnboarding();
  const saved = user && !user.isGuest;
  const { type } = useTheme();
  const [deleting, setDeleting] = useState(false);
  const [motivation, setMotivation] = useState(null);
  const [miles, setMiles] = useState({ earned: [], next: null }); // milestones reached, and the next one

  useFocusEffect(
    useCallback(() => {
      loadMotivation().then(setMotivation);
      // Milestones reached (kept on this phone) and the next one, from the hours bought back so far.
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
      `Your ${saved ? 'account, ' : ''}Buyback Rate, your routine, your handoffs and your photo will be deleted for good.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: deleteEverything },
      ],
      { cancelable: true }
    );
  const styles = useStyles(makeStyles);
  const currency = onboarding?.currency || 'USD';
  const role = ROLES.find((r) => r.key === onboarding?.role);
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <Screen edges={['top']}>
      <PageHeader eyebrow="Me" title="Your settings" />

      <Text style={[type.label, styles.whyLabel]}>Your why</Text>
      {motivation ? <MotivationCard motivation={motivation} onChange={setMotivation} /> : null}

      <Text style={[type.label, styles.section]}>Your numbers</Text>
      <Card style={styles.card}>
        <Row
          icon="cash-outline"
          title="Buyback Rate"
          value={`${formatMoney(onboarding?.buybackRate, currency)}/hr · from ${formatMoney(onboarding?.annualIncome, currency, { decimals: 0 })} a year`}
          onPress={() => navigation.navigate('BuybackRate', { editing: true })}
        />
        <View style={styles.divider} />
        <Row
          icon="briefcase-outline"
          title="What describes you"
          value={role?.label || 'Not set'}
          onPress={() => navigation.navigate('Profile', { editing: true })}
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

      <Text style={[type.label, styles.section]}>Account</Text>
      <Card style={styles.card}>
        {saved ? (
          <>
            <Row icon="person-circle-outline" title={user.name || 'Signed in'} value={user.email} />
            <View style={styles.divider} />
            <Row icon="log-out-outline" title="Sign out" onPress={confirmSignOut} />
          </>
        ) : (
          <>
            <Row
              icon="cloud-upload-outline"
              title="Save your progress"
              value="Create an account so you never lose your data."
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
  section: { marginTop: spacing.lg, marginBottom: spacing.sm },
  whyLabel: { marginBottom: spacing.sm },
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
