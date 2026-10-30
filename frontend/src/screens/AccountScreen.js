import { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import Button from '../components/Button';
import ErrorBanner from '../components/ErrorBanner';
import { useOnboarding } from '../context/OnboardingContext';
import { resetTo } from '../constants/content';
import { useStyles, useTheme } from '../theme/ThemeContext';
import { spacing } from '../theme';

// "Continue with Google" sits above the email form once Google sign-in is built (it needs the next APK).
const GOOGLE_SIGN_IN = false;

/**
 * Save your progress (guest → account, keeps everything) or sign in, on one calm page: the quickest
 * option first, then just email and password, a link to switch between the two, and the terms line.
 */
export default function AccountScreen({ navigation, route }) {
  const mode = route.params?.mode === 'signin' ? 'signin' : 'save';
  const saving = mode === 'save';
  const { user, saveAccount, updateName, signIn } = useOnboarding();
  const { colors } = useTheme();
  const styles = useStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false); // the account was just created
  const [name, setName] = useState('');
  const passwordRef = useRef(null);

  const validEmail = /^\S+@\S+\.\S+$/.test(email.trim());
  const ready = validEmail && password.length >= 8;

  const submit = async () => {
    if (!ready || loading) return;
    setError('');
    setLoading(true);
    try {
      if (saving) {
        await saveAccount({ email: email.trim(), password });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        setSaved(true);
        setLoading(false);
      } else {
        const next = await signIn({ email: email.trim(), password });
        navigation.reset(resetTo(next));
      }
    } catch (err) {
      setError(err.status === 409 ? 'That email already has an account. Sign in instead?' : err.message);
      setLoading(false);
    }
  };

  // Opened from the start screen there is no guest yet, so "new here" just goes back to Get started.
  const switchMode = () => {
    setError('');
    if (user) navigation.setParams({ mode: saving ? 'signin' : 'save' });
    else navigation.goBack();
  };

  // The name is optional: Skip goes straight Home; a name saves first (a failed save still goes on).
  const goHome = () => navigation.navigate('Main', { screen: 'Home' });
  const finish = async () => {
    if (name.trim()) {
      setLoading(true);
      await updateName(name.trim()).catch(() => {});
    }
    goHome();
  };

  if (saved) {
    return (
      <Screen avoidKeyboard>
        <View style={styles.done}>
          <View style={[styles.icon, styles.iconDone]}>
            <Ionicons name="checkmark" size={30} color={colors.onColor} />
          </View>
          <Text style={[styles.title, styles.center]} accessibilityRole="header">
            Your progress is saved
          </Text>
          <Text style={[styles.sub, styles.center]}>Sign in on any phone to pick up where you left off.</Text>
        </View>
        <TextField
          label="What should we call you?"
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          autoComplete="name"
          textContentType="name"
          returnKeyType="done"
          onSubmitEditing={finish}
          maxLength={80}
        />
        <Button title="Done" icon="checkmark" onPress={finish} loading={loading} style={styles.submit} />
        <Pressable onPress={goHome} accessibilityRole="button" style={styles.switch}>
          <Text style={[styles.switchText, styles.switchLink]}>Skip</Text>
        </Pressable>
      </Screen>
    );
  }

  const left = 8 - password.length;
  return (
    <Screen avoidKeyboard>
      <Pressable onPress={() => navigation.goBack()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close" style={styles.back}>
        <Ionicons name="close" size={24} color={colors.text} />
      </Pressable>

      <View style={styles.icon}>
        <Ionicons name={saving ? 'lock-closed' : 'person'} size={24} color={colors.primary} />
      </View>
      <Text style={styles.title} accessibilityRole="header">
        {saving ? 'Save your progress' : 'Welcome back'}
      </Text>
      <Text style={styles.sub}>{saving ? "Get it back on any phone. Nothing you've done is lost." : 'Sign in to pick up where you left off.'}</Text>

      {GOOGLE_SIGN_IN ? (
        <>
          {/* Filled in with Google sign-in: Google's standard white button. */}
          <View style={styles.or}>
            <View style={styles.rule} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.rule} />
          </View>
        </>
      ) : null}

      <View style={styles.form}>
        <TextField
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
            placeholder={saving ? 'Create a password' : 'Your password'}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete={saving ? 'new-password' : 'current-password'}
            textContentType={saving ? 'newPassword' : 'password'}
            returnKeyType="go"
            onSubmitEditing={submit}
            hint={saving ? (password.length && left > 0 ? `${left} more ${left === 1 ? 'character' : 'characters'}` : '8+ characters') : undefined}
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

      {!saving && user?.isGuest ? <Text style={styles.note}>Signing in replaces the guest progress on this phone.</Text> : null}
      <ErrorBanner message={error} />

      <Button
        title={saving ? 'Create account' : 'Sign in'}
        icon={saving ? 'cloud-upload-outline' : 'arrow-forward'}
        onPress={submit}
        loading={loading}
        disabled={!ready}
        style={styles.submit}
      />

      <Pressable onPress={switchMode} accessibilityRole="button" style={({ pressed }) => [styles.switch, pressed && { opacity: 0.7 }]}>
        <Text style={styles.switchText}>
          {saving ? 'Already have an account? ' : 'New here? '}
          <Text style={styles.switchLink}>{saving ? 'Sign in' : user ? 'Save your progress' : 'Get started'}</Text>
        </Text>
      </Pressable>

      {/* The policy pages become links once they're published (needed for the Play Store). */}
      <Text style={styles.legal}>By continuing you agree to the Terms and Privacy Policy.</Text>
    </Screen>
  );
}

const makeStyles = (colors) => ({
  back: { alignSelf: 'flex-start', paddingVertical: spacing.sm, marginBottom: spacing.sm },
  icon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5, color: colors.text, marginTop: spacing.md },
  sub: { fontSize: 15, lineHeight: 22, color: colors.muted, marginTop: 4, marginBottom: spacing.lg },
  or: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  rule: { flex: 1, height: 1, backgroundColor: colors.border },
  orText: { fontSize: 13, color: colors.muted },
  form: { gap: spacing.md },
  eye: { position: 'absolute', right: spacing.md, top: 42 },
  note: { fontSize: 13, color: colors.muted, marginTop: spacing.md },
  submit: { marginTop: spacing.lg },
  switch: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  switchText: { fontSize: 14, color: colors.muted },
  switchLink: { color: colors.primary, fontWeight: '700' },
  done: { alignItems: 'center', marginTop: spacing.xl },
  iconDone: { width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary },
  center: { textAlign: 'center' },
  legal: { fontSize: 12, lineHeight: 18, color: colors.muted, textAlign: 'center', marginTop: spacing.sm },
});
