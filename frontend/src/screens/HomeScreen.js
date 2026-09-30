import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import Button from '../components/Button';
import Logo from '../components/Logo';
import { useOnboarding } from '../context/OnboardingContext';
import { FEELINGS } from '../constants/content';
import { formatMoney } from '../utils/format';
import { colors, radius, spacing, type } from '../theme';

// Placeholder home. The Time & Energy Audit, DRIP Matrix, and Perfect Week come next.
export default function HomeScreen({ navigation }) {
  const { user, onboarding, logOut } = useOnboarding();
  const ladder = FEELINGS.find((f) => f.key === onboarding?.feeling);

  const handleLogOut = async () => {
    await logOut();
    navigation.reset({ index: 0, routes: [{ name: 'Landing' }] });
  };

  return (
    <Screen footer={<Button title="Log out" variant="secondary" onPress={handleLogOut} />}>
      <View style={styles.header}>
        <Logo size={56} />
        <View style={{ flex: 1 }}>
          <Text style={type.label}>Welcome{user?.name ? `, ${user.name}` : ''}</Text>
          <Text style={type.title}>You're set up.</Text>
        </View>
      </View>

      <View style={styles.rateCard}>
        <Text style={styles.rateLabel}>Your Buyback Rate</Text>
        <Text style={styles.rate}>{formatMoney(onboarding?.buybackRate)}/hr</Text>
      </View>

      {ladder ? (
        <View style={styles.card}>
          <Text style={styles.cardLabel}>This week's move</Text>
          <Text style={styles.cardTitle}>Start hiring your {ladder.nextHire}</Text>
          <Text style={styles.cardBody}>Give them ownership of {ladder.ownership.toLowerCase()}.</Text>
        </View>
      ) : null}

      <Text style={[type.subtitle, styles.soon]}>
        Coming next: your 2-week Time & Energy Audit, the DRIP Matrix, and your Perfect Week.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.md, marginBottom: spacing.lg },
  rateCard: { backgroundColor: colors.navy, borderRadius: radius.lg, padding: spacing.lg },
  rateLabel: { color: colors.primary, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  rate: { color: colors.white, fontSize: 40, fontWeight: '800', marginTop: 4 },
  card: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 4,
  },
  cardLabel: { fontSize: 12, fontWeight: '700', color: colors.accent, textTransform: 'uppercase', letterSpacing: 0.6 },
  cardTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  cardBody: { fontSize: 14, color: colors.muted },
  soon: { marginTop: spacing.lg },
});
