import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import Segmented from '../components/Segmented';
import { Card } from '../components/Card';
import { useOnboarding } from '../context/OnboardingContext';
import { ROLES } from '../constants/content';
import { formatMoney } from '../utils/format';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

const THEME_OPTIONS = [
  { key: 'system', label: 'Auto' },
  { key: 'light', label: 'Light' },
  { key: 'dark', label: 'Dark' },
];

function Row({ icon, title, value, onPress, disabled, badge }) {
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
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.primaryDark} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, disabled && { color: colors.muted }]}>{title}</Text>
        {value ? <Text style={styles.rowValue}>{value}</Text> : null}
      </View>
      {badge ? <Text style={styles.badge}>{badge}</Text> : null}
      {onPress && !disabled ? <Ionicons name="chevron-forward" size={18} color={colors.muted} /> : null}
    </Pressable>
  );
}

/** Settings and profile: Buyback Rate, business type, appearance, account (later), about. */
export default function MeScreen({ navigation }) {
  const { onboarding } = useOnboarding();
  const { type, mode, setMode } = useTheme();
  const styles = useStyles(makeStyles);
  const currency = onboarding?.currency || 'USD';
  const role = ROLES.find((r) => r.key === onboarding?.role);
  const version = Constants.expoConfig?.version || '1.0.0';

  return (
    <Screen edges={['top']}>
      <PageHeader eyebrow="Me" title="Your settings" />

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

      <Text style={[type.label, styles.section]}>Appearance</Text>
      <View style={styles.themeRow}>
        <Segmented options={THEME_OPTIONS} value={mode} onChange={setMode} accessibilityLabel="App theme" />
      </View>

      <Text style={[type.label, styles.section]}>Account</Text>
      <Card style={styles.card}>
        <Row
          icon="cloud-upload-outline"
          title="Save your progress"
          value="Create an account so you never lose your data."
          disabled
          badge="Soon"
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
  themeRow: { flexDirection: 'row' },
});
