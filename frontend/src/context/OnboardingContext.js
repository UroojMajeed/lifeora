import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client';
import { screenForStep } from '../constants/content';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [user, setUser] = useState(null);
  const [onboarding, setOnboarding] = useState(null);
  const [insights, setInsights] = useState(null);

  const applyUser = useCallback((u) => {
    setUser(u);
    setOnboarding(u?.onboarding || null);
  }, []);

  // Restores a saved session. Returns the screen the user should land on, or null if signed out.
  const bootstrap = useCallback(async () => {
    const token = await tokenStore.get();
    if (!token) return null;
    try {
      const { user: u } = await api.me();
      applyUser(u);
      return screenForStep(u.onboarding?.currentStep);
    } catch (err) {
      if (err.status === 401 || err.status === 404) await tokenStore.clear();
      return null;
    }
  }, [applyUser]);

  const signUp = useCallback(
    async ({ name, email, password }) => {
      const { token, user: u } = await api.register({ name, email, password });
      await tokenStore.set(token);
      applyUser(u);
      return screenForStep(u.onboarding?.currentStep);
    },
    [applyUser]
  );

  const logIn = useCallback(
    async ({ email, password }) => {
      const { token, user: u } = await api.login({ email, password });
      await tokenStore.set(token);
      applyUser(u);
      return screenForStep(u.onboarding?.currentStep);
    },
    [applyUser]
  );

  // Saves one step's answers and advances the server-side step pointer.
  const saveStep = useCallback(async (data, nextStep) => {
    const { onboarding: o } = await api.updateOnboarding({ ...data, currentStep: nextStep });
    setOnboarding(o);
    return o;
  }, []);

  const complete = useCallback(async () => {
    const res = await api.completeOnboarding();
    setOnboarding(res.onboarding);
    setInsights(res.insights);
    return res;
  }, []);

  const logOut = useCallback(async () => {
    await tokenStore.clear();
    setUser(null);
    setOnboarding(null);
    setInsights(null);
  }, []);

  const value = useMemo(
    () => ({ user, onboarding, insights, bootstrap, signUp, logIn, saveStep, complete, logOut }),
    [user, onboarding, insights, bootstrap, signUp, logIn, saveStep, complete, logOut]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
