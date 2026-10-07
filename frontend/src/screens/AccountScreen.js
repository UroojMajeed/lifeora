import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import PageHeader from '../components/PageHeader';
import TextField from '../components/TextField';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import { useOnboarding } from '../context/OnboardingContext';
import { resetTo } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

const PERKS = [
  { icon: 'shield-checkmark-outline', text: 'Keep everything if you lose or change your phone' },
  { icon: 'phone-portrait-outline', text: 'Sign in on any phone and pick up where you left off' },
  { icon: 'sparkles-outline', text: 'Nothing else changes: same app, same progress' },
];

/** Save your progress (guest → account, keeps everything) or sign in to an existing account. */
export default function AccountScreen({ navigation, route }) {
  const mode = route.params?.mode === 'signin' ? 'signin' : 'save';
  const saving = mode === 'save';
  const { user, saveAccount, signIn } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const ready = /^\S+@\S+\.\S+$/.test(email.trim()) && password.length >= 8;

  const submit = async () => {
    if (!ready || loading) return;
    setError('');
    setLoading(true);
    try {
      if (saving) {
        await saveAccount({ name: name.trim() || undefined, email: email.trim(), password });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        navigation.goBack();
      } else {
        const next = await signIn({ email: email.trim(), password });
        navigation.reset(resetTo(next));
      }
    } catch (err) {
      setError(err.status === 409 ? 'That email already has an account. Sign in instead?' : err.message);
      setLoading(false);
    }
  };

  return (
    <Screen
      footer={
        <Button
          title={saving ? 'Save my progress' : 'Sign in'}
          icon={saving ? 'cloud-upload-outline' : 'arrow-forward'}
          onPress={submit}
          loading={loading}
          disabled={!ready}
        />
      }
    >
      <PageHeader
        eyebrow={saving ? 'Your account' : 'Welcome back'}
        title={saving ? 'Save your progress' : 'Sign in'}
        subtitle={
          saving
            ? 'Create an account in a few seconds. Everything you have done so far comes with you.'
            : 'Use the email and password you saved your progress with.'
        }
      />

      {saving ? (
        <View style={styles.perks}>
          {PERKS.map((p) => (
            <View key={p.text} style={styles.perk}>
              <Ionicons name={p.icon} size={18} color={colors.primaryDark} />
              <Text style={styles.perkText}>{p.text}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.form}>
        {saving ? (
          <TextField
            label="Your name (optional)"
            value={name}
            onChangeText={setName}
            placeholder="Urooj"
            autoComplete="name"
            textContentType="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            maxLength={80}
          />
        ) : null}
        <TextField
          ref={emailRef}
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          autoComplete="email"
          textContentType={saving ? 'username' : 'emailAddress'}
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <View>
          <TextField
            ref={passwordRef}
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder={saving ? 'At least 8 characters' : 'Your password'}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={saving ? 'new-password' : 'current-password'}
            textContentType={saving ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={submit}
            hint={saving && password.length > 0 && password.length < 8 ? `${8 - password.length} more characters` : undefined}
          />
          <Pressable
            onPress={() => setShowPassword((s) => !s)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
            style={styles.eye}
          >
            <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      {!saving && user?.isGuest ? (
        <Text style={styles.note}>Signing in replaces the guest progress on this phone.</Text>
      ) : null}

      <ErrorBanner message={error} />

      {/* Opened from the start screen there is no guest yet, so "new here" just goes back to Get started. */}
      <Pressable
        onPress={() => (user ? navigation.setParams({ mode: saving ? 'signin' : 'save' }) : navigation.goBack())}
        accessibilityRole="button"
        style={({ pressed }) => [styles.switch, pressed && { opacity: 0.7 }]}
      >
        <Text style={styles.switchText}>
          {saving ? 'Already have an account? ' : 'New here? '}
          <Text style={styles.switchLink}>{saving ? 'Sign in' : user ? 'Save your progress instead' : 'Get started'}</Text>
        </Text>
      </Pressable>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  perks: { gap: spacing.sm + 2, marginBottom: spacing.lg },
  perk: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + 2 },
  perkText: { flex: 1, fontSize: 14, lineHeight: 20, color: colors.text },
  form: { gap: spacing.md },
  eye: { position: 'absolute', right: spacing.md, top: 42 },
  note: { fontSize: 13, color: colors.muted, marginTop: spacing.md },
  switch: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.sm },
  switchText: { fontSize: 14, color: colors.muted },
  switchLink: { color: colors.primary, fontWeight: '700' },
});
