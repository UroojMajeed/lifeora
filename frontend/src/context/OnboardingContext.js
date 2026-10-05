import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api, tokenStore } from '../api/client';
import { screenForStep } from '../constants/content';
import { loadMotivation, removeMotivation } from '../storage/motivation';
import { clearProgress } from '../storage/progress';

const OnboardingContext = createContext(null);

export function OnboardingProvider({ children }) {
  const [user, setUser] = useState(null);
  const [onboarding, setOnboarding] = useState(null);

  const applyUser = useCallback((u) => {
    setUser(u);
    setOnboarding(u?.onboarding || null);
  }, []);

  // Restores a saved session. Returns the screen the user should land on, or null if there is none.
  const bootstrap = useCallback(async () => {
    const token = await tokenStore.get();
    if (!token) return null;
    try {
      const { user: u } = await api.me();
      applyUser(u);
      return screenForStep(u.onboarding?.currentStep);
    } catch (err) {
      // The account is gone (expired or reset): start completely fresh, photo included.
      if (err.status === 401 || err.status === 404) {
        await tokenStore.clear();
        await removeMotivation(await loadMotivation());
        await clearProgress();
      }
      return null;
    }
  }, [applyUser]);

  // No sign-up wall: the first tap creates a guest account and this device keeps its token.
  const startAsGuest = useCallback(async () => {
    const { token, user: u } = await api.createGuest();
    await tokenStore.set(token);
    applyUser(u);
    return screenForStep(u.onboarding?.currentStep);
  }, [applyUser]);

  // Saves one step's answers and advances the server-side step pointer.
  const saveStep = useCallback(async (data, nextStep) => {
    const { onboarding: o } = await api.updateOnboarding({ ...data, currentStep: nextStep });
    setOnboarding(o);
    return o;
  }, []);

  const complete = useCallback(async () => {
    const res = await api.completeOnboarding();
    setOnboarding(res.onboarding);
    return res;
  }, []);

  // Changes made after onboarding (from My day or Me) keep the user in the app.
  const saveEdit = useCallback((data) => saveStep(data, 'done'), [saveStep]);

  // Deletes this account and everything in it, photo included, so the app starts over.
  const startOver = useCallback(async () => {
    try {
      await api.deleteMe();
    } catch (err) {
      if (err.status !== 401 && err.status !== 404) throw err; // already gone is fine
    }
    await tokenStore.clear();
    await removeMotivation(await loadMotivation());
    await clearProgress();
    applyUser(null);
  }, [applyUser]);

  const value = useMemo(
    () => ({ user, onboarding, bootstrap, startAsGuest, saveStep, saveEdit, complete, startOver }),
    [user, onboarding, bootstrap, startAsGuest, saveStep, saveEdit, complete, startOver]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return ctx;
}
