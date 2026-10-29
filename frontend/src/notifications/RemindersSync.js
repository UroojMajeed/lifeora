import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { useOnboarding } from '../context/OnboardingContext';
import { useHandoffs } from '../context/HandoffsContext';
import { onReminderTap, setResyncHandler, setUpReminders, syncReminders } from './index';

/**
 * Keeps this phone's reminders in step with your data: re-plans when handoffs, check-ins or reminder
 * settings change and when the app comes back to the front; a tapped reminder opens its screen.
 * Renders nothing. `navigationRef` is the app's navigation container ref.
 */
export default function RemindersSync({ navigationRef }) {
  const { user, onboarding } = useOnboarding();
  const { handoffs, checkIns } = useHandoffs();
  const inApp = Boolean(user) && onboarding?.currentStep === 'done';
  const state = useRef(null);
  state.current = { handoffs, checkIns, reminders: user?.reminders };

  const sync = useCallback(() => {
    if (inApp) syncReminders(state.current);
  }, [inApp]);

  useEffect(() => {
    setUpReminders();
    setResyncHandler(sync);
    return () => setResyncHandler(null);
  }, [sync]);

  useEffect(sync, [sync, handoffs, checkIns, user?.reminders]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => s === 'active' && sync());
    return () => sub.remove();
  }, [sync]);

  // A tapped reminder: once the app is in its main screens, open what it's about.
  const pending = useRef(null);
  const open = useCallback(
    (data) => {
      if (!inApp || !navigationRef.isReady()) {
        pending.current = data;
        return;
      }
      pending.current = null;
      navigationRef.navigate(data.screen, data.params);
    },
    [inApp, navigationRef]
  );
  useEffect(() => onReminderTap(open), [open]);
  useEffect(() => {
    if (inApp && pending.current) {
      const t = setTimeout(() => pending.current && open(pending.current), 400);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [inApp, open]);

  return null;
}
