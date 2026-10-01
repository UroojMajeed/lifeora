import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../../components/Screen';
import StepHeader from '../../components/StepHeader';
import Button from '../../components/Button';
import ErrorBanner from '../../components/ErrorBanner';
import { useOnboarding } from '../../context/OnboardingContext';
import { ROLES, stepNumber } from '../../constants/content';
import { useStyles, useTheme } from '../../theme/ThemeContext';
import { cardShadow, radius, spacing } from '../../theme';

export default function ProfileScreen({ navigation }) {
  const { onboarding, saveStep } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [role, setRole] = useState(onboarding?.role || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const choose = (key) => {
    Haptics.selectionAsync().catch(() => {});
    setRole(key);
  };

  const next = async () => {
    setError('');
    setLoading(true);
    try {
      const data = { role };
      // A different role means different suggestions, so start their day fresh.
      if (onboarding?.role && role !== onboarding.role) data.schedule = [];
      await saveStep(data, 'buyback_rate');
      navigation.navigate('BuybackRate');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen footer={<Button title="Continue" icon="arrow-forward" onPress={next} loading={loading} disabled={!role} />}>
      <StepHeader
        step={stepNumber('profile')}
        eyebrow="Let's begin"
        title="What best describes you?"
        subtitle="We'll suggest the activities people like you usually do."
      />

      <View style={styles.grid}>
        {ROLES.map((r) => {
          const on = role === r.key;
          return (
            <Pressable
              key={r.key}
              onPress={() => choose(r.key)}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.tile, on && styles.tileOn, pressed && { transform: [{ scale: 0.98 }] }]}
            >
              <View style={[styles.iconWrap, on && styles.iconWrapOn]}>
                <Ionicons name={r.icon} size={22} color={on ? colors.onColor : colors.primaryDark} />
              </View>
              <Text style={[styles.label, on && styles.labelOn]}>{r.label}</Text>
              {on ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={styles.check} /> : null}
            </Pressable>
          );
        })}
      </View>

      <ErrorBanner message={error} />
    </Screen>
  );
}

const makeStyles = (colors, isDark) => ({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + 4 },
  tile: {
    width: '47.5%',
    minHeight: 120,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: isDark ? colors.border : 'transparent',
    justifyContent: 'space-between',
    ...cardShadow(colors, isDark),
  },
  tileOn: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
  },
  iconWrapOn: { backgroundColor: colors.primary },
  label: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  labelOn: { color: colors.text },
  check: { position: 'absolute', top: spacing.md, right: spacing.md },
});
