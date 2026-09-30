import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../../components/Screen';
import Button from '../../components/Button';
import TextField from '../../components/TextField';
import ErrorBanner from '../../components/ErrorBanner';
import Logo from '../../components/Logo';
import { useOnboarding } from '../../context/OnboardingContext';
import { colors, spacing, type } from '../../theme';

const EMAIL_RE = /^\S+@\S+\.\S+$/;

export default function AuthScreen({ navigation, route }) {
  const { signUp, logIn } = useOnboarding();
  const [mode, setMode] = useState(route.params?.mode === 'login' ? 'login' : 'signup');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const isSignup = mode === 'signup';
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const validate = () => {
    const e = {};
    if (isSignup && !form.name.trim()) e.name = 'Tell us what to call you';
    if (!EMAIL_RE.test(form.email.trim())) e.email = 'Enter a valid email';
    if (form.password.length < 8) e.password = 'At least 8 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async () => {
    setServerError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = { email: form.email.trim(), password: form.password };
      const next = isSignup ? await signUp({ ...payload, name: form.name.trim() }) : await logIn(payload);
      navigation.reset({ index: 0, routes: [{ name: next }] });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      footer={
        <>
          <Button title={isSignup ? 'Create account' : 'Log in'} onPress={submit} loading={loading} />
          <Pressable
            onPress={() => {
              setMode(isSignup ? 'login' : 'signup');
              setErrors({});
              setServerError('');
            }}
            style={styles.switch}
            accessibilityRole="button"
          >
            <Text style={styles.switchText}>
              {isSignup ? 'Already have an account? ' : 'New to Reclaim? '}
              <Text style={styles.switchLink}>{isSignup ? 'Log in' : 'Create one'}</Text>
            </Text>
          </Pressable>
        </>
      }
    >
      <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.back} accessibilityRole="button">
        <Text style={styles.backText}>‹ Back</Text>
      </Pressable>

      <View style={styles.header}>
        <Logo size={64} />
        <Text style={[type.title, styles.title]}>{isSignup ? 'Start buying back your time' : 'Welcome back'}</Text>
        <Text style={type.subtitle}>
          {isSignup
            ? 'Create your account. Your answers in the next steps are saved to it.'
            : 'Log in to pick up where you left off.'}
        </Text>
      </View>

      <View style={styles.form}>
        {isSignup ? (
          <TextField
            label="Name"
            value={form.name}
            onChangeText={set('name')}
            error={errors.name}
            placeholder="Your first name"
            autoCapitalize="words"
            autoComplete="name"
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
          />
        ) : null}
        <TextField
          ref={emailRef}
          label="Email"
          value={form.email}
          onChangeText={set('email')}
          error={errors.email}
          placeholder="you@company.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          returnKeyType="next"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <TextField
          ref={passwordRef}
          label="Password"
          value={form.password}
          onChangeText={set('password')}
          error={errors.password}
          hint={isSignup ? 'At least 8 characters' : undefined}
          placeholder="••••••••"
          secureTextEntry
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          returnKeyType="go"
          onSubmitEditing={submit}
        />
        <ErrorBanner message={serverError} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { paddingVertical: spacing.sm, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: colors.primaryDark },
  header: { marginTop: spacing.md, marginBottom: spacing.lg, gap: spacing.sm },
  title: { marginTop: spacing.sm },
  form: { gap: spacing.md },
  switch: { alignItems: 'center', paddingVertical: spacing.sm },
  switchText: { fontSize: 15, color: colors.muted },
  switchLink: { color: colors.primaryDark, fontWeight: '700' },
});
